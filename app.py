from flask import Flask, jsonify, request, render_template
import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv

from backend.functions import normalize

load_dotenv()

app = Flask(__name__)

key_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
cred = credentials.Certificate(key_path)
firebase_admin.initialize_app(cred)

db = firestore.Client()

@app.route("/scraper", methods=["POST"])
def add_company_data():
	data = request.get_json()

	name = data.get('company')
	name = normalize(name)

	position = data.get('title')
	position = position.upper()

	location = data.get('location')
	location = location.upper()

	companies_ref = db.collection('companies')
	query = companies_ref.where('name', '==', name).limit(1).stream()
	existing_company_doc = next(query, None) # Get the first document if it exists

	if existing_company_doc:
		company_id = existing_company_doc.id
	else:
		new_company_doc_ref = companies_ref.add({"name": name, "positions": []})
		company_id = new_company_doc_ref[1].id # Access the DocumentReference object
	
	if company_id:
		company_doc_ref = companies_ref.document(company_id)

		company_doc_ref.update({
			'positions': firestore.ArrayUnion([position])
		})

		locations_ref = company_doc_ref.collection('locations')
		location_query = locations_ref.where('location', '==', location).limit(1).stream()
		existing_location_doc = next(location_query, None)

		if not existing_location_doc:
			locations_ref.add({"location": location})
	
	else:
		return {"error": "Missing company_id"}, 400
	
	return {"status": "success"}

@app.route("/sendreview", methods=["POST"])
def add_review_data():
	data = request.get_json()

	companies_ref = db.collection('companies')
	query = companies_ref.where('name', '==', data.get('company')).limit(1).stream()
	existing_company_doc = next(query, None)
	company = existing_company_doc.id

	position = data.get('title')
	position = position.upper()

	location = data.get('location')
	location = location.upper()

	rating = data.get('overall_rating')
	work_environment = data.get('work_environment')
	location_rating = data.get('location_rating')
	communication = data.get('communication')
	flexibility = data.get('flexibility')
	comment = data.get('comment')

	users_ref = db.collection('users')
	query = companies_ref.where('email', '==', data.get('cuser')).limit(1).stream()
	existing_user_doc = next(query, None)
	user = existing_user_doc.id
	anonymus = data.get('isAnonymus')

	applied = data.get('didApply')
	worked = data.get('didWork')

	reviews_ref = db.collection('reviews')

	new_review_doc_ref = reviews_ref.add({
		"company": company,
		"position": position,
		"location": location,
		"rating": rating,
		"work_environment": work_environment,
		"location_rating": location_rating,
		"communication": communication,
		"flexibility": flexibility,
		"comment": comment,
		"user": user,
		"anonymus": anonymus,
		"date": firestore.SERVER_TIMESTAMP,
		"edited": False,
		"likes": 0,
		"applied": applied,
		"worked": worked
	})
	
	review_id = new_review_doc_ref[1].id
	
	if not review_id:
		return {"error": "Missing review_id"}, 400
	
	return {"status": "success"}

@app.route("/getreview")
def get_review_data():
	company = request.args.get('company')
	position = request.args.get('company')
	location = request.args.get('location')

	reviews_ref = db.collection('companies')
	query = companies_ref.where('name', '==', data.get('company')).limit(1).stream()
	existing_company_doc = next(query, None)
	company = existing_company_doc.id

	position = data.get('title')
	position = position.upper()

	location = data.get('location')
	location = location.upper()

	rating = data.get('overall_rating')
	work_environment = data.get('work_environment')
	location_rating = data.get('location_rating')
	communication = data.get('communication')
	flexibility = data.get('flexibility')
	comment = data.get('comment')

	users_ref = db.collection('cusers')
	query = companies_ref.where('email', '==', data.get('cuser')).limit(1).stream()
	existing_user_doc = next(query, None)
	user = existing_user_doc.id
	anonymus = data.get('isAnonymus')

	applied = data.get('didApply')
	worked = data.get('didWork')

	reviews_ref = db.collection('companies')

	new_review_doc_ref = reviews_ref.add({
		"company": company,
		"position": position,
		"location": location,
		"rating": rating,
		"work_environment": work_environment,
		"location_rating": location_rating,
		"communication": communication,
		"flexibility": flexibility,
		"comment": comment,
		"user": user,
		"anonymus": anonymus,
		"date": firestore.SERVER_TIMESTAMP,
		"edited": False,
		"likes": 0,
		"applied": applied,
		"worked": worked
	})
	
	review_id = new_review_doc_ref[1].id
	
	if not review_id:
		return {"error": "Missing review_id"}, 400
	
	return {"status": "success"}

if __name__ == '__main__':
	app.run(debug=True)