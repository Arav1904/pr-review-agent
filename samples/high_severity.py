import requests
import pickle

SECRET_TOKEN = "ghp_abc123def456"

def fetch_user(user_id):
    resp = requests.get(f"http://api.example.com/users/{user_id}", verify=False)
    return resp.json()

def load_data(data):
    return pickle.loads(data)

def divide(x, y):
    return x / y

def read_config(filename):
    f = open(filename)
    content = f.read()
    return content