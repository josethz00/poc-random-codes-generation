import random
import string

def generate_code(batch_size=1):
    number_part = f"{random.randint(0, 9999):04}"
    
    letters_part = ''.join(random.choices(string.ascii_uppercase, k=3))
    
    return number_part + letters_part

