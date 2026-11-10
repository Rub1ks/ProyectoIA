import re
from typing import List
from sqlmodel import Session, select, or_
from database import engine
from models import Document


def search_relevant_context(query: str) -> str:
    """
    Busca en la base de datos hasta 3 documentos relevantes cuyo title o content
    contengan palabras clave de la consulta.
    Devuelve los fragmentos de texto encontrados concatenados en un solo string.
    """
    if not query or not query.strip():
        return ""

    # Extraer palabras alfanuméricas de más de 2 caracteres
    words = re.findall(r"\w+", query.strip().lower())
    keywords = [w for w in words if len(w) > 2]

    if not keywords:
        keywords = [query.strip().lower()]

    with Session(engine) as session:
        # Construir filtros LIKE para título y contenido por cada palabra clave
        conditions = []
        for kw in keywords:
            pattern = f"%{kw}%"
            conditions.append(Document.title.ilike(pattern))
            conditions.append(Document.content.ilike(pattern))

        statement = select(Document).where(or_(*conditions)).limit(3)
        documents: List[Document] = session.exec(statement).all()

        if not documents:
            return ""

        # Formatear y concatenar los fragmentos de los documentos encontrados
        snippets = [
            f"[{doc.title} - {doc.category}]\n{doc.content}"
            for doc in documents
        ]
        return "\n\n---\n\n".join(snippets)
