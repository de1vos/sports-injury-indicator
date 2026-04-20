from pathlib import Path
from sqlalchemy import text
from database_init import engine

sql = Path("test_data.sql").read_text()

with engine.connect() as conn:
    for statement in sql.split(";"):
        statement = statement.strip()
        if statement:
            conn.execute(text(statement))
    conn.commit()

print("Database seeded successfully.")
