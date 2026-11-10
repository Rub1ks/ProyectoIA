from typing import List, Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import create_db_and_tables
from ai_service import generate_chat_response

app = FastAPI(title="Proyecto IA API")


class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


# Configurar CORS para permitir peticiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción se debe cambiar por la URL del frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"mensaje": "Bienvenido a la API del Proyecto IA"}


@app.post("/api/chat")
def chat(request: ChatRequest):
    try:
        response_text = generate_chat_response(request.messages)
        return {"response": response_text}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error en el servicio de IA: {str(e)}"
        )
