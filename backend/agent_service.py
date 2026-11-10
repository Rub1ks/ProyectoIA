from rag_service import search_relevant_context
from ai_service import generate_chat_response


def plan_trip(destination: str, days: int) -> str:
    """
    Agente de viajes: busca información relevante del destino en la base de datos
    y genera un itinerario detallado usando IA.
    """
    # 1. Buscar información del destino en la base de datos usando RAG
    contexto = search_relevant_context(destination)

    # 2. Construir el prompt específico para el agente de viajes
    prompt = (
        f"Actúa como un agente de viajes. Crea un itinerario de {days} días para {destination}. "
        f"Usa esta información oficial: {contexto}. Sé creativo pero cíngete a los datos."
    )

    # 3. Llamar a la IA y devolver el itinerario generado
    messages = [{"role": "user", "content": prompt}]
    return generate_chat_response(messages)


def recommend_items(category: str) -> str:
    """
    Agente de recomendaciones: busca información de la categoría en la base de datos
    y genera recomendaciones justificadas usando IA.
    """
    # 1. Buscar información sobre la categoría en la base de datos usando RAG
    contexto = search_relevant_context(category)

    # 2. Construir el prompt específico para el agente de recomendaciones
    prompt = (
        f"Eres un experto en recomendaciones. Basándote en esta información: {contexto}, "
        f"recomienda las 3 mejores opciones de la categoría '{category}'. "
        f"Explica brevemente por qué las recomiendas."
    )

    # 3. Llamar a la IA y devolver el resultado
    messages = [{"role": "user", "content": prompt}]
    return generate_chat_response(messages)

