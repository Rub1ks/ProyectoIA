import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Union
import bcrypt
from jose import jwt, JWTError

# Parche de compatibilidad entre passlib 1.7.4 y versiones recientes de bcrypt (>= 4.0 / 5.0)
if not hasattr(bcrypt, "__about__"):
    class _About:
        __version__ = getattr(bcrypt, "__version__", "4.0.0")
    bcrypt.__about__ = _About()

_orig_hashpw = bcrypt.hashpw


def _safe_hashpw(password, salt):
    if isinstance(password, str):
        password = password.encode("utf-8")
    if len(password) > 72:
        password = password[:72]
    return _orig_hashpw(password, salt)


bcrypt.hashpw = _safe_hashpw

from passlib.context import CryptContext  # noqa: E402

# Configuración de hashing de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuración de tokens JWT
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si una contraseña en texto plano coincide con su hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Genera el hash seguro de una contraseña usando bcrypt."""
    return pwd_context.hash(password)


def create_access_token(
    subject: Union[str, dict],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Genera un token JWT incluyendo el sujeto (email en el campo 'sub') y fecha de expiración.
    Puede recibir un string (el email directamente) o un diccionario con datos adicionales.
    """
    if isinstance(subject, dict):
        to_encode = subject.copy()
    else:
        to_encode = {"sub": str(subject)}

    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decodifica y valida un token JWT.
    Retorna el diccionario payload si el token es válido y no ha expirado.
    Retorna None si el token es inválido o expiró.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
