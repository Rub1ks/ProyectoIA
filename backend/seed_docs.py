from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models import Document

docs_data = [
    {
        "title": "Políticas de la Universidad",
        "category": "Reglamento",
        "content": (
            "El límite de tokens para los estudiantes es de 5000. "
            "Las clases inician el 15 de enero y terminan el 30 de mayo. "
            "El uso de la IA está permitido siempre y cuando se cite la fuente."
        ),
    },
    {
        "title": "Turismo en Quetzaltenango",
        "category": "Guía de viaje",
        "content": (
            "Quetzaltenango, también conocida como Xela, es la segunda ciudad más importante de Guatemala. "
            "Sus principales atracciones son el Cerro El Baúl, las Termas de Almolonga y el centro histórico. "
            "El clima es frío."
        ),
    },
    {
        "title": "Recomendaciones de Películas",
        "category": "Entretenimiento",
        "content": (
            "Para los amantes del sci-fi, recomendamos Inception y Interstellar. "
            "Si buscan comedia, The Grand Budapest Hotel es una excelente opción."
        ),
    },
]


def seed_documents():
    create_db_and_tables()
    with Session(engine) as session:
        added_count = 0
        for item in docs_data:
            existing = session.exec(
                select(Document).where(Document.title == item["title"])
            ).first()
            if not existing:
                doc = Document(**item)
                session.add(doc)
                added_count += 1

        session.commit()
        print(f"Éxito: Se registraron {added_count} documentos de prueba en la base de datos.")


if __name__ == "__main__":
    seed_documents()
