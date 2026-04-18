from flask import Flask, jsonify, request, render_template
import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

key_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
cred = credentials.Certificate(key_path)
firebase_admin.initialize_app(cred)

db = firestore.Client()

@app.route("/")
def basic_data_display():
	company_ref = db.collection('copmanies').document('7xi72ulDWcUtCT3AttSj')
	company_doc = company_ref.get()

	if company_doc.exists:
		company_data = company_doc.to_dict()
		print(f"Company Details for {'7xi72ulDWcUtCT3AttSj'}: {company_data}")
		
		locations_ref = db.collection('copmanies').document('7xi72ulDWcUtCT3AttSj').collection('locations')
		locations_docs = locations_ref.stream() # Use .stream() to get all documents in a collection

		locations_list = []
		for loc_doc in locations_docs:
			location_data = loc_doc.to_dict()
			location_data['id'] = loc_doc.id # Include the document ID if needed
			locations_list.append(location_data)

		print(f"Locations for {'7xi72ulDWcUtCT3AttSj'}: {locations_list}")
		return company_data, locations_list
	else:
		print(f"Company with ID {'7xi72ulDWcUtCT3AttSj'} not found.")
		return None

if __name__ == '__main__':
	app.run(debug=True)