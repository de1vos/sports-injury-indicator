from pathlib import Path
from sqlalchemy import text
from database_init import engine, SQLModel
import ingest_predictions

print("Dropping schema...")
with engine.connect() as conn:
    conn.execute(text("DROP SCHEMA public CASCADE"))
    conn.execute(text("CREATE SCHEMA public"))
    conn.commit()

print("Recreating tables...")
SQLModel.metadata.create_all(engine)

print("Running ingestion...")
ingest_predictions.main()
