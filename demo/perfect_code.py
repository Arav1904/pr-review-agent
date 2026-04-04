"""
User service module — production-grade implementation.
All patterns follow PEP 8, PEP 484, and Google Python Style Guide.
"""
from __future__ import annotations

import os
import logging
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Generator, Optional, List
import sqlite3

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class UserId:
    """Value object for user identity."""
    value: int

    def __post_init__(self) -> None:
        if self.value <= 0:
            raise ValueError(f"UserId must be positive, got {self.value}")


@dataclass
class User:
    """Domain model for a user account."""
    id: Optional[UserId]
    username: str
    email: str
    is_active: bool = True

    def __post_init__(self) -> None:
        if not self.username:
            raise ValueError("Username cannot be empty")
        if "@" not in self.email:
            raise ValueError(f"Invalid email: {self.email}")


class DatabaseError(Exception):
    """Raised when a database operation fails."""


class UserNotFoundError(DatabaseError):
    """Raised when a requested user does not exist."""


class UserRepository:
    """
    Data access layer for User entities.

    Uses parameterized queries throughout to prevent SQL injection.
    All connections use context managers to prevent resource leaks.
    """

    def __init__(self, db_path: Optional[str] = None) -> None:
        self._db_path = db_path or os.environ.get("DATABASE_PATH", "users.db")

    @contextmanager
    def _connect(self) -> Generator[sqlite3.Connection, None, None]:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        except sqlite3.Error as exc:
            conn.rollback()
            raise DatabaseError(f"Database operation failed: {exc}") from exc
        finally:
            conn.close()

    def get(self, user_id: UserId) -> User:
        """
        Retrieve a user by ID.

        Raises:
            UserNotFoundError: If no user with the given ID exists.
            DatabaseError: On any database failure.
        """
        with self._connect() as conn:
            row = conn.execute(
                "SELECT id, username, email, is_active FROM users WHERE id = ?",
                (user_id.value,),
            ).fetchone()

        if row is None:
            raise UserNotFoundError(f"No user with id={user_id.value}")

        return User(
            id=UserId(row["id"]),
            username=row["username"],
            email=row["email"],
            is_active=bool(row["is_active"]),
        )

    def list_active(self, *, limit: int = 20, offset: int = 0) -> List[User]:
        """Return active users with pagination."""
        if limit < 1 or limit > 100:
            raise ValueError(f"limit must be 1–100, got {limit}")
        if offset < 0:
            raise ValueError(f"offset must be non-negative, got {offset}")

        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id, username, email, is_active "
                "FROM users WHERE is_active = 1 "
                "ORDER BY username LIMIT ? OFFSET ?",
                (limit, offset),
            ).fetchall()

        return [
            User(
                id=UserId(r["id"]),
                username=r["username"],
                email=r["email"],
                is_active=bool(r["is_active"]),
            )
            for r in rows
        ]