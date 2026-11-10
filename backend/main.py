from typing import List, Dict
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlmodel import Session, select, func

from database import create_db_and_tables, get_session
from models import User, ChatSession, Message
from security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
)
from ai_service import generate_chat_response
from rag_service import search_relevant_context
from agent_service import plan_trip

app = FastAPI(title="Proyecto IA API")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")


# Modelos Pydantic para peticiones
class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]


class UserRegister(BaseModel):
    email: str
    password: str


class TripRequest(BaseModel):
    destination: str
    days: int


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


# Configurar CORS para permitir peticiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción se debe cambiar por la URL del frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependencia para obtener el usuario autenticado actual
def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if not payload:
        raise credentials_exception

    email: str = payload.get("sub")
    if not email:
        raise credentials_exception

    statement = select(User).where(User.email == email)
    user = session.exec(statement).first()
    if not user:
        raise credentials_exception

    return user


@app.get("/")
def read_root():
    return {"mensaje": "Bienvenido a la API del Proyecto IA"}


@app.post("/api/register", status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, session: Session = Depends(get_session)):
    # Verificar si el email ya está registrado
    statement = select(User).where(User.email == user_data.email)
    existing_user = session.exec(statement).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado",
        )

    # Hashear contraseña y crear usuario
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        role="user",
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    return {
        "id": new_user.id,
        "email": new_user.email,
        "role": new_user.role,
        "message": "Usuario registrado exitosamente",
    }


@app.post("/api/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    # form_data.username se usa para recibir el email
    statement = select(User).where(User.email == form_data.username)
    user = session.exec(statement).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=user.email)
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@app.post("/api/chat")
def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # 1. Verificar si el usuario ha superado su límite de tokens
    if current_user.tokens_used >= current_user.token_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Límite de tokens excedido",
        )

    # 2. Extraer el último mensaje del usuario (role == "user")
    user_messages = [
        msg.get("content", "")
        for msg in request.messages
        if msg.get("role") == "user"
    ]
    user_text = user_messages[-1] if user_messages else ""

    # 3. Buscar contexto relevante usando RAG
    contexto_recuperado = search_relevant_context(user_text)

    # 4. Obtener o crear la sesión de chat actual del usuario
    statement_session = (
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.id.desc())
    )
    chat_session = session.exec(statement_session).first()
    if not chat_session:
        chat_session = ChatSession(user_id=current_user.id)
        session.add(chat_session)
        session.commit()
        session.refresh(chat_session)

    # 5. Recuperar los últimos 10 mensajes de la base de datos para memoria conversacional
    statement_messages = (
        select(Message)
        .where(Message.session_id == chat_session.id)
        .order_by(Message.id.desc())
        .limit(10)
    )
    recent_messages = session.exec(statement_messages).all()

    # Invertir para mantener el orden cronológico
    conversation_history = [
        {"role": msg.role, "content": msg.content}
        for msg in reversed(recent_messages)
    ]

    # Agregar el nuevo mensaje del usuario al final del historial
    conversation_history.append({"role": "user", "content": user_text})

    # 6. Llamar a la IA pasando la lista completa (historial + nuevo mensaje) y el contexto RAG
    try:
        response_text = generate_chat_response(
            conversation_history,
            context=contexto_recuperado,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error en el servicio de IA: {str(e)}",
        )

    # 7. Estimar tokens usados (len(texto) // 4)
    user_tokens = max(1, len(user_text) // 4) if user_text else 0
    ai_tokens = max(1, len(response_text) // 4) if response_text else 0
    total_tokens = user_tokens + ai_tokens

    # 8. Guardar el nuevo mensaje del usuario y la respuesta de la IA en la base de datos
    user_msg = Message(
        session_id=chat_session.id,
        role="user",
        content=user_text,
        tokens_used=user_tokens,
    )
    ai_msg = Message(
        session_id=chat_session.id,
        role="assistant",
        content=response_text,
        tokens_used=ai_tokens,
    )
    session.add(user_msg)
    session.add(ai_msg)

    # 9. Sumar tokens estimados al usuario y guardar cambios
    current_user.tokens_used += total_tokens
    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    # 10. Calcular tokens restantes y devolver respuesta
    tokens_remaining = max(0, current_user.token_limit - current_user.tokens_used)

    return {
        "response": response_text,
        "tokens_remaining": tokens_remaining,
    }


@app.get("/api/reports/usage")
def get_usage_report(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # Consulta agregada con SQLModel: suma de tokens y fecha de último mensaje por usuario
    statement = (
        select(
            User.email,
            User.role,
            func.coalesce(func.sum(Message.tokens_used), 0).label("total_tokens_used"),
            func.max(Message.timestamp).label("last_activity"),
        )
        .outerjoin(ChatSession, User.id == ChatSession.user_id)
        .outerjoin(Message, ChatSession.id == Message.session_id)
        .group_by(User.id, User.email, User.role)
    )

    # Si no es admin, limitar el reporte únicamente al usuario autenticado
    if current_user.role != "admin":
        statement = statement.where(User.id == current_user.id)

    results = session.exec(statement).all()

    return [
        {
            "email": row.email,
            "role": row.role,
            "total_tokens_used": int(row.total_tokens_used),
            "last_activity": row.last_activity,
        }
        for row in results
    ]


@app.post("/api/agent/trip")
def agent_trip(
    request: TripRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        itinerary = plan_trip(destination=request.destination, days=request.days)
        return {"itinerary": itinerary}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error en el agente de viajes: {str(e)}",
        )
