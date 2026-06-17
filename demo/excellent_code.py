from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from contextlib import contextmanager
import logging
import sqlite3
import os

logger = logging.getLogger(__name__)

@dataclass
class User:
    id: Optional[int] = None
    username: str = ""
    email: str = ""
    is_active: bool = True

@dataclass
class PaginatedResult:
    items: List[Any] = field(default_factory=list)
    total: int = 0
    page: int = 1
    per_page: int = 20

class UserRepository:
    """Repository for user data access with full error handling."""
    
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or os.environ.get("DATABASE_PATH", "users.db")
    
    @contextmanager
    def _connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            conn.close()
    
    def find_by_id(self, user_id: int) -> Optional[User]:
        """Find user by ID. Returns None if not found."""
        if not isinstance(user_id, int) or user_id <= 0:
            raise ValueError(f"Invalid user_id: {user_id}")
        
        with self._connection() as conn:
            row = conn.execute(
                "SELECT id, username, email, is_active FROM users WHERE id = ?",
                (user_id,)
            ).fetchone()
        
        return User(**dict(row)) if row else None
    
    def list_active(self, page: int = 1, per_page: int = 20) -> PaginatedResult:
        """Return paginated active users."""
        if page < 1 or per_page < 1 or per_page > 100:
            raise ValueError("Invalid pagination parameters")
        
        offset = (page - 1) * per_page
        with self._connection() as conn:
            total = conn.execute(
                "SELECT COUNT(*) FROM users WHERE is_active = 1"
            ).fetchone()[0]
            rows = conn.execute(
                "SELECT id, username, email, is_active FROM users WHERE is_active = 1 LIMIT ? OFFSET ?",
                (per_page, offset)
            ).fetchall()
        
        return PaginatedResult(
            items=[User(**dict(r)) for r in rows],
            total=total,
            page=page,
            per_page=per_page
        )