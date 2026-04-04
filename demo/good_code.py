from typing import Optional, List, Dict
import logging
from contextlib import contextmanager
import sqlite3

logger = logging.getLogger(__name__)

class UserRepository:
    def __init__(self, db_path: str):
        self.db_path = db_path
    
    @contextmanager
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def find_by_username(self, username: str) -> Optional[Dict]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, username, email FROM users WHERE username = ?",
                (username,)
            )
            row = cursor.fetchone()
            if row:
                return {"id": row[0], "username": row[1], "email": row[2]}
            return None
    
    def create_user(self, username: str, email: str) -> bool:
        if not username or not email:
            raise ValueError("Username and email are required")
        try:
            with self.get_connection() as conn:
                conn.execute(
                    "INSERT INTO users (username, email) VALUES (?, ?)",
                    (username, email)
                )
            return True
        except sqlite3.IntegrityError:
            logger.warning(f"User {username} already exists")
            return False