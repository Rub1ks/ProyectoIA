import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine, select

# Asegurar que la carpeta backend esté en el sys.path para importar los módulos correctamente
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app, get_session
from models import User
from security import get_password_hash, create_access_token


# Configurar una base de datos SQLite en memoria independiente para pruebas
@pytest.fixture(name="session")
def session_fixture(monkeypatch):
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # Evitar que el evento startup toque app.db
    monkeypatch.setattr("main.create_db_and_tables", lambda: None)
    # También redirigir el engine en rag_service por si interactúa con la base de datos
    monkeypatch.setattr("rag_service.engine", test_engine)

    SQLModel.metadata.create_all(test_engine)

    with Session(test_engine) as session:
        yield session

    SQLModel.metadata.drop_all(test_engine)


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def override_get_session():
        yield session

    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


# ========================================================
# 1. Pruebas de Autenticación (/api/register y /api/login)
# ========================================================

def test_register_user(client: TestClient):
    # Registro exitoso
    payload = {
        "email": "nuevo_usuario@test.com",
        "password": "PasswordSegura123!",
    }
    response = client.post("/api/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == payload["email"]
    assert data["role"] == "user"
    assert "id" in data

    # Intento de registro duplicado (debe retornar 400)
    duplicate_res = client.post("/api/register", json=payload)
    assert duplicate_res.status_code == 400
    assert "El email ya está registrado" in duplicate_res.json()["detail"]


def test_login_user(client: TestClient, session: Session):
    # Crear usuario en la base de datos de prueba
    email = "login_user@test.com"
    plain_password = "SecretPassword123"
    hashed_password = get_password_hash(plain_password)

    user = User(
        email=email,
        hashed_password=hashed_password,
        role="user",
        token_limit=1000,
        tokens_used=0,
    )
    session.add(user)
    session.commit()

    # Login exitoso (usando x-www-form-urlencoded requerido por OAuth2PasswordRequestForm)
    login_data = {
        "username": email,
        "password": plain_password,
    }
    response = client.post("/api/login", data=login_data)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

    # Login con contraseña incorrecta (debe retornar 401)
    bad_login_data = {
        "username": email,
        "password": "PasswordIncorrecta",
    }
    bad_response = client.post("/api/login", data=bad_login_data)
    assert bad_response.status_code == 401
    assert "Credenciales incorrectas" in bad_response.json()["detail"]


# ========================================================
# 2. Prueba de límite de tokens excedido (/api/chat -> 429)
# ========================================================

def test_chat_token_limit_exceeded(client: TestClient, session: Session):
    # Crear usuario sin tokens disponibles (token_limit=0, tokens_used=0)
    email = "bloqueado@test.com"
    user = User(
        email=email,
        hashed_password=get_password_hash("password123"),
        role="user",
        token_limit=0,
        tokens_used=0,
    )
    session.add(user)
    session.commit()

    # Generar token JWT válido para el usuario
    token = create_access_token(user.email)
    headers = {"Authorization": f"Bearer {token}"}

    # Intentar enviar un mensaje al chat
    payload = {
        "messages": [
            {"role": "user", "content": "Hola, ¿puedes ayudarme?"}
        ]
    }
    response = client.post("/api/chat", json=payload, headers=headers)

    # Debe retornar 429 Too Many Requests
    assert response.status_code == 429
    assert "Límite de tokens excedido" in response.json()["detail"]


# ========================================================
# 3. Prueba de chat exitoso con mock de IA y actualización de tokens
# ========================================================

def test_chat_success_and_tokens_updated(
    client: TestClient, session: Session, mocker
):
    # Crear usuario con tokens disponibles
    initial_tokens_used = 0
    token_limit = 5000
    email = "usuario_con_tokens@test.com"

    user = User(
        email=email,
        hashed_password=get_password_hash("password123"),
        role="user",
        token_limit=token_limit,
        tokens_used=initial_tokens_used,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    user_id = user.id

    # Mockear generate_chat_response para no llamar a Groq
    mock_ai_response = "Esta es una respuesta simulada por el asistente virtual."
    mocker.patch("main.generate_chat_response", return_value=mock_ai_response)

    # Generar token JWT
    token = create_access_token(user.email)
    headers = {"Authorization": f"Bearer {token}"}

    # Petición al chat
    payload = {
        "messages": [
            {"role": "user", "content": "Hola, ¿cuánto tiempo dura el semestre?"}
        ]
    }
    response = client.post("/api/chat", json=payload, headers=headers)

    # 1. Verificar respuesta HTTP 200 OK
    assert response.status_code == 200
    data = response.json()
    assert data["response"] == mock_ai_response
    assert "tokens_remaining" in data
    assert data["tokens_remaining"] < token_limit

    # 2. Verificar que los tokens del usuario se actualizaron en la base de datos
    session.expire_all()
    user_in_db = session.get(User, user_id)
    assert user_in_db is not None
    assert user_in_db.tokens_used > initial_tokens_used
    assert user_in_db.tokens_used == (token_limit - data["tokens_remaining"])
