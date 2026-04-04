from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

def calculate_discount(price: float, discount: float) -> float:
    if discount < 0 or discount > 100:
        raise ValueError("Discount must be between 0 and 100")
    return price * (1 - discount / 100)

def find_user(users: List[dict], name: str) -> Optional[dict]:
    for user in users:
        if user.get("name") == name:
            return user
    return None

def process_items(items: List[int]) -> List[int]:
    return [item * 2 for item in items]

class DataManager:
    def __init__(self):
        self.data: List = []
    
    def add(self, item) -> None:
        self.data.append(item)
        logger.info(f"Added item: {item}")
    
    def get(self, index: int):
        try:
            return self.data[index]
        except IndexError:
            logger.error(f"Index {index} out of range")
            return None