from typing import Annotated, Generator
from fastapi import Depends
from sqlmodel import Session, SQLModel, create_engine
from app.core.config import settings

def get_engine():
    db_url = settings.DATABASE_URL
    # Normalizar para psycopg si viene con postgresql:// directo
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+psycopg://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

    connect_args = {}
    if db_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}

    return create_engine(db_url, echo=False, connect_args=connect_args)

engine = get_engine()

def create_db_and_tables():
    # Importar los modelos para que SQLModel los registre en metadata
    import app.models.domain  # noqa: F401
    SQLModel.metadata.create_all(engine)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session

SessionDep = Annotated[Session, Depends(get_session)]
