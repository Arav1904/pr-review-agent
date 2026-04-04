def calculate_average(numbers):
    total = 0
    for n in numbers:
        total += n
    return total / len(numbers)

def find_user(users, name):
    for user in users:
        if user["name"] == name:
            return user

def process_items(items):
    results = []
    for i in range(len(items)):
        result = items[i] * 2
        results.append(result)
    return results

class DataManager:
    def __init__(self):
        self.data = []
    
    def add(self, item):
        self.data.append(item)
    
    def get(self, index):
        return self.data[index]