from sqlmodel import Session
from database_init import engine


def get_session():
    with Session(engine) as session:
        yield session
