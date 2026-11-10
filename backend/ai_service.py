import os
from dotenv import load_dotenv
from groq import Groq

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# Cargar la clave de API desde las variables de entorno
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


def generate_chat_response(messages: list, context: str = "") -> str:
    """
    Envía una lista de mensajes a la API de Groq y devuelve la respuesta generada.
    Si se proporciona un contexto, añade un mensaje de sistema al inicio.
    """
    messages_to_send = list(messages)
    if context and context.strip():
        system_message = {
            "role": "system",
            "content": f"Eres un asistente útil. Usa la siguiente información para responder: {context.strip()}",
        }
        messages_to_send = [system_message] + messages_to_send

    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=messages_to_send,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error al conectar con la API de Groq: {e}")
        raise
