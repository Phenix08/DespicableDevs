import re

def normalize(name):
	name = name.upper()

	suffixes = [
    r"\bD\s*\.?\s*O\s*\.?\s*O\s*\.?\b",
    r"\bD\s*\.?\s*D\s*\.?\b",
    r"\bS\s*\.?\s*P\s*\.?\b",
    r"\bD\s*\.?\s*N\s*\.?\s*O\s*\.?\b"
]

	for suffix in suffixes:
		name = re.sub(suffix, "", name)
	
	name = re.sub(r"[^\w\s]", "", name, flags=re.UNICODE)
	name = re.sub(r"\s+", " ", name).strip()
	return name

def average_rating(ratings_array):
	total = 0
	for rating in ratings_array:
		total += rating

	return total / len(ratings_array)