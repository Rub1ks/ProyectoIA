from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    role: str = Field(default="user")
    token_limit: int = Field(default=10000)
    tokens_used: int = Field(default=0)

    # Relación con las sesiones de chat
    sessions: List["ChatSession"] = Relationship(back_populates="user", cascade_delete=True)


class ChatSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relaciones
    user: Optional[User] = Relationship(back_populates="sessions")
    messages: List["Message"] = Relationship(back_populates="session", cascade_delete=True)


class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="chatsession.id")
    role: str
    content: str
    tokens_used: int = Field(default=0)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relación con la sesión de chat
    session: Optional[ChatSession] = Relationship(back_populates="messages")
