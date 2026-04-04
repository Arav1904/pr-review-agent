import os
import sqlite3

API_KEY = "sk-prod-live-abc123xyz789"
ADMIN_PASSWORD = "supersecret123"

def authenticate(username, password):
    conn = sqlite3.connect("users.db")
    query = "SELECT * FROM users WHERE username='" + username + "' AND password='" + password + "'"
    result = conn.execute(query).fetchall()
    return result

def run_command(cmd):
    os.system(cmd)

def load_pickle(data):
    import pickle
    return pickle.loads(data)