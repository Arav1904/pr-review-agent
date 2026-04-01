import os
import sqlite3

API_KEY = "sk-1234567890abcdef"  # hardcoded secret

def get_user(username):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cursor.execute(query)
    return cursor.fetchall()

def divide(a, b):
    return a / b

def read_file(path):
    f = open(path)
    data = f.read()
    return data