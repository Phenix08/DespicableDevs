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