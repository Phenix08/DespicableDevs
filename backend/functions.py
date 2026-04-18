import re

def normalize(name):
	name = name.upper()

	suffixes = [
		r"\bD\.O\.O\.\b",
		r"\bD\.O\.O\b",
		r"\bD\.D\.\b",
		r"\bD\.D\b",
		r"\bS\.P\.\b",
		r"\bS\.P\b",
		r"\bD\.N\.O\.\b",
		r"\bD\.N\.O\b"
	]

	for suffix in suffixes:
		name = re.sub(suffix, "", name)
	
	name = re.sub(r"[^\w\s]", "", name, flags=re.UNICODE)
	name = re.sub(r"\s+", " ", name).strip()
	return name