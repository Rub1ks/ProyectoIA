from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_db_and_tables

app = FastAPI(title="Proyecto IA API")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Configurar CORS para permitir peticiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción se debe cambiar por la URL del frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"mensaje": "Bienvenido a la API del Proyecto IA"}