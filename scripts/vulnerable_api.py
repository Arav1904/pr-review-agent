import sqlite3
import os
import requests

# Hardcoded credentials - DO NOT COMMIT
DATABASE_PASSWORD = "super_secret_123"
API_KEY = "sk-prod-9876543210abcdef"
SECRET_TOKEN = "ghp_realtoken12345"

class UserService:
    def __init__(self):
        self.db = sqlite3.connect("users.db")
    
    def get_user(self, username):
        # SQL injection vulnerability
        query = "SELECT * FROM users WHERE username = '" + username + "'"
        return self.db.execute(query).fetchall()
    
    def delete_user(self, user_id):
        # Another SQL injection
        self.db.execute("DELETE FROM users WHERE id = " + user_id)
    
    def calculate_discount(self, price, discount):
        # Division by zero risk
        return price / discount
    
    def read_config(self, path):
        # Unclosed file handle
        f = open(path)
        return f.read()
    
    def run_command(self, user_input):
        # Command injection
        os.system("echo " + user_input)
    
    def fetch_data(self, url):
        # Disabled SSL verification
        return requests.get(url, verify=False)