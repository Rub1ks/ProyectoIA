import os
from dotenv import load_dotenv
from sqlmodel import SQLModel, Session, create_engine

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# Importar modelos para asegurar que se registren en SQLModel.metadata
try:
    from models import User, ChatSession, Message, Document
except ImportError:
    from backend.models import User, ChatSession, Message, Document

# Leer DATABASE_URL de las variables de entorno
database_url = os.getenv("DATABASE_URL")

if database_url:
    # Render / Heroku pueden usar 'postgres://', SQLAlchemy requiere 'postgresql://'
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    engine = create_engine(database_url)
else:
    # Base de datos SQLite local para desarrollo
    sqlite_url = "sqlite:///./app.db"
    connect_args = {"check_same_thread": False}
    engine = create_engine(sqlite_url, connect_args=connect_args)


def create_db_and_tables():
    """Crea la base de datos y todas las tablas definidas en los modelos."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Generador de sesiones de base de datos para inyección de dependencias."""
    with Session(engine) as session:
        yield session


if __name__ == "__main__":
    create_db_and_tables()
