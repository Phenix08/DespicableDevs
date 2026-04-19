from flask import Flask, jsonify, request, render_template
import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv

from backend.functions import normalize, average_rating

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
	data = request.get_json() or {}

	companies_ref = db.collection('companies')
	company = data.get('company')
	company_normalized = normalize(company)
	query = companies_ref.where('name', '==', company_normalized).limit(1).stream()
	existing_company_doc = next(query, None)
	if not existing_company_doc:
		return {"error": "Company not found"}, 400
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
	query = users_ref.where('email', '==', data.get('user')).limit(1).stream()
	existing_user_doc = next(query, None)
	user = existing_user_doc.id if existing_user_doc else None
	anonymous = data.get('isAnonymous')

	applied = data.get('didApply')
	worked = data.get('didWork')

	reviews_ref = db.collection('reviews')

	review_payload = {
		"company": company,
		"position": position,
		"location": location,
		"rating": rating,
		"work_environment": work_environment,
		"location_rating": location_rating,
		"communication": communication,
		"flexibility": flexibility,
		"comment": comment,
		"anonymous": anonymous,
		"date": firestore.SERVER_TIMESTAMP,
		"edited": False,
		"likes": 0,
		"applied": applied,
		"worked": worked
	}

	if user:
		review_payload["user"] = user

	new_review_doc_ref = reviews_ref.add(review_payload)
	
	review_id = new_review_doc_ref[1].id
	
	if not review_id:
		return {"error": "Missing review_id"}, 400
	
	return {"status": "success", "review_id": review_id}, 201

@app.route("/getreview")
def get_review_data():
	company = normalize((request.args.get('company') or '').strip())
	position = (request.args.get('position') or '').strip().upper()
	location = (request.args.get('location') or '').strip().upper()

	if not company or not position or not location:
		return jsonify({
			"averages": {
				"overall": 0,
				"work_environment": 0,
				"location": 0,
				"flexibility": 0,
				"communication": 0
			},
			"reviews": []
		})

	companies_ref = db.collection('companies')
	query = companies_ref.where('name', '==', company).limit(1).stream()
	existing_company_doc = next(query, None)
	if not existing_company_doc:
		return jsonify({
			"averages": {
				"overall": 0,
				"work_environment": 0,
				"location": 0,
				"flexibility": 0,
				"communication": 0
			},
			"reviews": []
		})
	company_id = existing_company_doc.id

	reviews_ref = db.collection('reviews')
	query = (
		reviews_ref
		.where('company', '==', company_id)
		.where('position', '==', position)
		.where('location', '==', location)
		.stream()
	)
	reviews = [doc.to_dict() for doc in query]

	overall_averages = []
	work_environment_averages = []
	location_rating_averages = []
	flexibility_averages = []
	communication_averages = []

	for review in reviews:
		overall_value = review.get('rating', review.get('overall_rating'))
		work_environment_value = review.get('work_environment')
		location_rating_value = review.get('location_rating')
		flexibility_value = review.get('flexibility')
		communication_value = review.get('communication')

		if overall_value is not None:
			overall_averages.append(int(overall_value))
		if work_environment_value is not None:
			work_environment_averages.append(int(work_environment_value))
		if location_rating_value is not None:
			location_rating_averages.append(int(location_rating_value))
		if flexibility_value is not None:
			flexibility_averages.append(int(flexibility_value))
		if communication_value is not None:
			communication_averages.append(int(communication_value))

		if review.get('anonymous'):
			review['user'] = 'Anonymous'
		else:
			user_id = review.get('user')
			if user_id:
				user_doc = db.collection("users").document(user_id).get()
				review['user'] = user_doc.get('display_name') if user_doc.exists else 'Unknown user'
			else:
				review['user'] = 'Unknown user'

	def safe_average(values):
		return average_rating(values) if len(values) > 0 else 0

	return jsonify({
		"averages": {
			"overall": safe_average(overall_averages),
			"work_environment": safe_average(work_environment_averages),
			"location": safe_average(location_rating_averages),
			"flexibility": safe_average(flexibility_averages),
			"communication": safe_average(communication_averages)
		},
		"reviews": reviews
	})

@app.route("/getcompany")
def get_company_data():
	company = request.args.get('company')

	companies_ref = db.collection('companies')
	query = companies_ref.where('name', '==', company).limit(1).stream()
	existing_company_doc = next(query, None)
	company_id = existing_company_doc.id
	
	company_details = existing_company_doc.to_dict()

	# Initialize list for locations
	locations_list = []

	# --- Fetch Locations from Subcollection ---
	locations_ref = companies_ref.document(company_id).collection('locations')
	for loc_doc in locations_ref.stream():
		location_data = loc_doc.to_dict()
		location_data['id'] = loc_doc.id # Add subcollection document ID
		locations_list.append(location_data)

	# --- Extract Job Positions from Array within the Company Document ---
	job_positions_list = company_details.get('job_positions', [])

	if 'job_positions' in company_details:
		del company_details['job_positions']

	company_details['id'] = company_id
	company_details['locations'] = locations_list
	company_details['job_positions'] = job_positions_list

	return jsonify(company_details)

if __name__ == '__main__':
	app.run(debug=True)