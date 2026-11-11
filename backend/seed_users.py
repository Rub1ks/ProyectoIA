from datetime import datetime, timedelta, timezone
from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models import User, ChatSession, Message
from security import get_password_hash

users_data = [
    {
        "email": "ana@test.com",
        "role": "user",
        "messages": [
            {
                "role": "user",
                "content": "¿Cómo puedo planificar un viaje a Quetzaltenango?",
                "tokens": 45,
                "hours_ago": 36,
            },
            {
                "role": "assistant",
                "content": "Te recomiendo visitar el Cerro El Baúl y el centro histórico.",
                "tokens": 120,
                "hours_ago": 35,
            },
            {
                "role": "user",
                "content": "¿Qué clima hace por allá?",
                "tokens": 30,
                "hours_ago": 24,
            },
            {
                "role": "assistant",
                "content": "El clima es frío, te sugiero llevar ropa abrigada.",
                "tokens": 85,
                "hours_ago": 23,
            },
        ],
    },
    {
        "email": "carlos@test.com",
        "role": "user",
        "messages": [
            {
                "role": "user",
                "content": "Recomiéndame películas de ciencia ficción.",
                "tokens": 40,
                "hours_ago": 48,
            },
            {
                "role": "assistant",
                "content": "Te sugiero ver Inception e Interstellar de Christopher Nolan.",
                "tokens": 150,
                "hours_ago": 47,
            },
            {
                "role": "user",
                "content": "¿Hay alguna opción de comedia clásica?",
                "tokens": 35,
                "hours_ago": 12,
            },
            {
                "role": "assistant",
                "content": "The Grand Budapest Hotel es fantástica.",
                "tokens": 110,
                "hours_ago": 11,
            },
            {
                "role": "user",
                "content": "¡Gracias por la recomendación!",
                "tokens": 25,
                "hours_ago": 10,
            },
        ],
    },
    {
        "email": "maria@test.com",
        "role": "user",
        "messages": [
            {
                "role": "user",
                "content": "¿Cuáles son las políticas de tokens en la universidad?",
                "tokens": 55,
                "hours_ago": 18,
            },
            {
                "role": "assistant",
                "content": "Los estudiantes cuentan con un límite de 5000 tokens.",
                "tokens": 130,
                "hours_ago": 17,
            },
            {
                "role": "user",
                "content": "¿Cuándo inician las clases oficiales?",
                "tokens": 35,
                "hours_ago": 6,
            },
            {
                "role": "assistant",
                "content": "Las clases inician el 15 de enero y culminan el 30 de mayo.",
                "tokens": 140,
                "hours_ago": 5,
            },
        ],
    },
    {
        "email": "luis@test.com",
        "role": "user",
        "messages": [
            {
                "role": "user",
                "content": "Ayúdame a redactar una solicitud académica.",
                "tokens": 60,
                "hours_ago": 72,
            },
            {
                "role": "assistant",
                "content": "Claro, aquí tienes una plantilla formal con tus datos.",
                "tokens": 320,
                "hours_ago": 71,
            },
            {
                "role": "user",
                "content": "Añade un párrafo solicitando prórroga de entrega.",
                "tokens": 50,
                "hours_ago": 30,
            },
            {
                "role": "assistant",
                "content": "Se ha añadido la solicitud de extensión por motivos justificados.",
                "tokens": 210,
                "hours_ago": 29,
            },
            {
                "role": "user",
                "content": "Perfecto, muchas gracias.",
                "tokens": 20,
                "hours_ago": 2,
            },
        ],
    },
]


def seed_test_users():
    create_db_and_tables()
    hashed_pwd = get_password_hash("1234")
    now = datetime.now(timezone.utc)

    with Session(engine) as session:
        for u_info in users_data:
            email = u_info["email"]

            # Si el usuario ya existe, limpiamos sus sesiones previas para evitar duplicados
            existing_user = session.exec(
                select(User).where(User.email == email)
            ).first()

            if existing_user:
                user = existing_user
                user.hashed_password = hashed_pwd
                # Borrar mensajes y sesiones asociadas existentes
                for s in session.exec(select(ChatSession).where(ChatSession.user_id == user.id)).all():
                    for m in session.exec(select(Message).where(Message.session_id == s.id)).all():
                        session.delete(m)
                    session.delete(s)
                session.commit()
            else:
                user = User(
                    email=email,
                    hashed_password=hashed_pwd,
                    role=u_info.get("role", "user"),
                    token_limit=10000,
                    tokens_used=0,
                )
                session.add(user)
                session.commit()
                session.refresh(user)

            # 2. Crear una ChatSession para el usuario
            chat_session = ChatSession(
                user_id=user.id,
                created_at=now - timedelta(hours=80),
            )
            session.add(chat_session)
            session.commit()
            session.refresh(chat_session)

            # 3. Crear entre 3 y 5 mensajes con diferentes consumos
            total_tokens = 0
            for msg_data in u_info["messages"]:
                msg_time = now - timedelta(hours=msg_data["hours_ago"])
                message = Message(
                    session_id=chat_session.id,
                    role=msg_data["role"],
                    content=msg_data["content"],
                    tokens_used=msg_data["tokens"],
                    timestamp=msg_time,
                )
                session.add(message)
                total_tokens += msg_data["tokens"]

            # 4. Actualizar tokens_used del usuario
            user.tokens_used = total_tokens
            session.add(user)
            session.commit()

            print(
                f"✓ Usuario: {user.email} | Sesión ID: {chat_session.id} | "
                f"Mensajes: {len(u_info['messages'])} | Tokens consumidos: {user.tokens_used}"
            )

    print("\n¡Base de datos poblada exitosamente para Power BI!")


if __name__ == "__main__":
    seed_test_users()
