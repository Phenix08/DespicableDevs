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
	
	name = re.sub(r"[^A-Z0-9\s]", "", name)
	name = re.sub(r"\s+", " ", name).strip()
	return name