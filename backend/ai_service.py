import os
from dotenv import load_dotenv
from groq import Groq

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# Cargar la clave de API desde las variables de entorno
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


def generate_chat_response(messages: list) -> str:
    """
    Envía una lista de mensajes a la API de Groq utilizando el modelo llama3-8b-8192
    y devuelve la respuesta generada.
    """
    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        response = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=messages,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error al conectar con la API de Groq: {e}")
        raise
