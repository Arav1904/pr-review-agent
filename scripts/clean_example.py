import os
import sqlite3
from contextlib import closing


def get_user(username: str) -> list:
    """Fetch user by username using parameterized query."""
    db_path = os.environ.get("DATABASE_PATH", "users.db")
    with closing(sqlite3.connect(db_path)) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM users WHERE username = ?", (username,)
        )
        return cursor.fetchall()


def calculate_discount(price: float, discount: float) -> float:
    """Calculate discounted price safely."""
    if discount == 0:
        raise ValueError("Discount cannot be zero")
    return price / discount