from sqlmodel import SQLModel, Session, create_engine

# Importar modelos para asegurar que se registren en SQLModel.metadata
try:
    from models import User, ChatSession, Message, Document
except ImportError:
    from backend.models import User, ChatSession, Message, Document

sqlite_file_name = "app.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)


def create_db_and_tables():
    """Crea la base de datos SQLite y todas las tablas definidas en los modelos."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Generador de sesiones de base de datos para inyección de dependencias."""
    with Session(engine) as session:
        yield session


if __name__ == "__main__":
    create_db_and_tables()
