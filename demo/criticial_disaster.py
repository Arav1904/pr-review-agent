import os, subprocess

PASSWORD = "admin123"
DB_CONN = "postgresql://admin:password123@prod-db.company.com/users"
AWS_KEY = "AKIAIOSFODNN7EXAMPLE"
AWS_SECRET = "wJalrXUtnFEMI/K7MDENG/bPDXfiCYEXAMPLEKEY"

def login(username, password):
    query = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
    os.system(f"mysql -e \"{query}\"")

def run_report(user_input):
    subprocess.call(f"bash -c '{user_input}'", shell=True)

def get_file(path):
    return eval(open(path).read())

def delete_all():
    os.system("rm -rf /")