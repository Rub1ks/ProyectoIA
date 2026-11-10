from sqlmodel import Session, select
from database import engine
from models import User


def toggle_user_token_limit():
    with Session(engine) as session:
        statement = select(User).where(User.email == "diego@test.com")
        user = session.exec(statement).first()

        if not user:
            print("Usuario 'diego@test.com' no encontrado en la base de datos.")
            return

        if user.token_limit > 0:
            user.token_limit = 0
            session.add(user)
            session.commit()
            print("Límite cambiado a 0 (Bloqueado)")
        else:
            user.token_limit = 10000
            session.add(user)
            session.commit()
            print("Límite cambiado a 10000 (Desbloqueado)")


if __name__ == "__main__":
    toggle_user_token_limit()
