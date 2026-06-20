import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime, timedelta
import jwt
import bcrypt
from bson import ObjectId
from dotenv import load_dotenv
import random

load_dotenv()

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your_super_secret_key_123')

# MongoDB / Mock Setup
try:
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
    client.server_info() # Trigger connection check
    db = client['smart_meter_db']
    USE_MOCK = False
    print("--- Connected to MongoDB ---")
except:
    USE_MOCK = True
    print("--- MongoDB not found. Using MOCK DATABASE (In-Memory) ---")
    
    # Mock Data
    hashed_pass = bcrypt.hashpw(b"password123", bcrypt.gensalt())
    mock_users = [
        {'_id': ObjectId('650000000000000000000001'), 'email': 'admin@gov.ae', 'password': hashed_pass, 'role': 'admin', 'name': 'Gov Official'},
        {'_id': ObjectId('650000000000000000000002'), 'email': 'resident1@home.com', 'password': hashed_pass, 'role': 'resident', 'meter_id': 'MTR-001', 'name': 'Ahmed Mansour'}
    ]
    mock_readings = []
    # Seed mock readings
    for i in range(50):
        mock_readings.append({
            'meter_id': 'MTR-001',
            'timestamp': datetime.utcnow() - timedelta(hours=i),
            'load': round(random.uniform(0.5, 2.5), 2),
            'active_appliances': ['AC', 'Fridge']
        })

# Helper functions to handle both Mock and Real DB
def get_user_by_email(email):
    if USE_MOCK:
        return next((u for u in mock_users if u['email'] == email), None)
    return db.users.find_one({'email': email})

def get_user_by_id(uid):
    if USE_MOCK:
        return next((u for u in mock_users if str(u['_id']) == str(uid)), None)
    return db.users.find_one({'_id': ObjectId(uid)})

def get_readings(meter_id):
    if USE_MOCK:
        return [r for r in mock_readings if r['meter_id'] == meter_id]
    return list(db.readings.find({'meter_id': meter_id}).sort('timestamp', -1).limit(100))

def get_all_residents():
    if USE_MOCK:
        return [u for u in mock_users if u['role'] == 'resident']
    return list(db.users.find({'role': 'resident'}, {'password': 0}))

# Security Helper
def generate_token(user_id, role, meter_id=None):
    payload = {
        'user_id': str(user_id),
        'role': role,
        'meter_id': meter_id,
        'exp': datetime.utcnow() + timedelta(days=1)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def token_required(f):
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        try:
            auth_token = token.split(" ")[1]
            data = jwt.decode(auth_token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = get_user_by_id(data['user_id'])
            if not current_user: raise Exception("User not found")
        except Exception as e:
            print("Token Error:", str(e))
            return jsonify({'message': 'Token is invalid'}), 401
        return f(current_user, *args, **kwargs)
    decorated.__name__ = f.__name__
    return decorated

# Egyptian Electricity Tiers (in EGP)
def calculate_bill_amount(kwh):
    if kwh <= 50:
        rate = 0.68
    elif kwh <= 100:
        rate = 0.78
    elif kwh <= 200:
        rate = 0.95
    elif kwh <= 350:
        rate = 1.55
    elif kwh <= 650:
        rate = 1.95
    elif kwh <= 1000:
        rate = 2.10
    else:
        rate = 2.23
    return round(kwh * rate, 2)

@app.route('/api/user/bill/current', methods=['GET'])
@token_required
def get_current_bill(current_user):
    # Calculate current month's usage
    now = datetime.now()
    first_day = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    readings = list(db.readings.find({
        'meter_id': current_user['meter_id'],
        'timestamp': {'$gte': first_day}
    }))
    
    total_kwh = sum(r.get('load', 0) for r in readings)
    amount = calculate_bill_amount(total_kwh)
    
    # Check if a bill for this month already exists in billing collection
    month_str = now.strftime("%B %Y")
    existing_bill = db.billing.find_one({'meter_id': current_user['meter_id'], 'month': month_str})
    
    bill_data = {
        'meter_id': current_user['meter_id'],
        'month': month_str,
        'total_kwh': round(total_kwh, 2),
        'amount_due': amount,
        'status': existing_bill['status'] if existing_bill else 'unpaid'
    }
    
    # Upsert the current month's bill
    db.billing.update_one(
        {'meter_id': current_user['meter_id'], 'month': month_str},
        {'$set': bill_data},
        upsert=True
    )
    
    return jsonify(bill_data)

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    user = get_user_by_email(data['email'])
    
    if user and bcrypt.checkpw(data['password'].encode('utf-8'), user['password']):
        token = generate_token(user['_id'], user['role'], user.get('meter_id'))
        return jsonify({
            'token': token,
            'role': user['role'],
            'email': user['email'],
            'meter_id': user.get('meter_id'),
            'name': user.get('name'),
            'is_mock': USE_MOCK
        })
    
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/admin/customers', methods=['GET'])
@token_required
def get_customers(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    customers = get_all_residents()
    for c in customers:
        c['_id'] = str(c['_id'])
        if 'password' in c: del c['password']
    return jsonify(customers)

@app.route('/api/admin/anomalies', methods=['GET'])
@token_required
def get_anomalies(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    if USE_MOCK:
        # Guarantee anomalies in Mock Mode for demo purposes
        anomalies = [
            {'meter_id': 'MTR-001', 'timestamp': datetime.utcnow() - timedelta(minutes=45), 'type': 'Consumption Spike', 'severity': 'High', 'location': 'District 4, Cluster X'},
            {'meter_id': 'MTR-002', 'timestamp': datetime.utcnow() - timedelta(hours=2), 'type': 'Potential Leakage', 'severity': 'Medium', 'location': 'District 1, Cluster Z'},
            {'meter_id': 'MTR-003', 'timestamp': datetime.utcnow() - timedelta(hours=5), 'type': 'Meter Tampering', 'severity': 'High', 'location': 'District 7, Cluster Y'},
            {'meter_id': 'MTR-001', 'timestamp': datetime.utcnow() - timedelta(hours=12), 'type': 'Voltage Drop', 'severity': 'Low', 'location': 'District 4, Cluster X'},
            {'meter_id': 'MTR-002', 'timestamp': datetime.utcnow() - timedelta(days=1), 'type': 'Backfeeding', 'severity': 'Medium', 'location': 'District 2, Cluster A'}
        ]
    else:
        anomalies = list(db.anomalies.find().sort('timestamp', -1).limit(50))
    
    for a in anomalies:
        if '_id' in a: a['_id'] = str(a['_id'])
    return jsonify(anomalies)

@app.route('/api/admin/customer/<meter_id>/readings', methods=['GET'])
@token_required
def get_customer_readings(current_user, meter_id):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    readings = get_readings(meter_id)
    for r in readings:
        if '_id' in r: r['_id'] = str(r['_id'])
    return jsonify(readings)

@app.route('/api/user/readings', methods=['GET'])
@token_required
def get_user_readings(current_user):
    meter_id = current_user.get('meter_id')
    if not meter_id:
        return jsonify({'message': 'No meter assigned'}), 400
    
    readings = get_readings(meter_id)
    for r in readings:
        if '_id' in r: r['_id'] = str(r['_id'])
    return jsonify(readings)

@app.route('/api/user/billing', methods=['GET'])
@token_required
def get_user_billing(current_user):
    meter_id = current_user.get('meter_id')
    if USE_MOCK:
        bills = [{'month': 'April 2026', 'total_kwh': 450.2, 'amount_due': 180.5, 'status': 'paid'}]
    else:
        bills = list(db.billing.find({'meter_id': meter_id}).sort('month', -1))
    
    for b in bills:
        if '_id' in b: b['_id'] = str(b['_id'])
    return jsonify(bills)

@app.route('/api/user/bill/<bill_id>/pay', methods=['POST'])
@token_required
def pay_bill(current_user, bill_id):
    if USE_MOCK:
        return jsonify({'message': 'Payment successful (Mock)'})
    
    db.billing.update_one(
        {'_id': ObjectId(bill_id), 'meter_id': current_user.get('meter_id')},
        {'$set': {'status': 'paid', 'payment_date': datetime.utcnow()}}
    )
    return jsonify({'message': 'Payment processed successfully'})

@app.route('/api/admin/customer/<meter_id>/billing', methods=['GET'])
@token_required
def get_admin_customer_billing(current_user, meter_id):
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    bills = list(db.billing.find({'meter_id': meter_id}).sort('month', -1))
    for b in bills:
        b['_id'] = str(b['_id'])
    return jsonify(bills)

@app.route('/api/notifications', methods=['GET'])
@token_required
def get_notifications(current_user):
    meter_id = current_user.get('meter_id')
    if USE_MOCK:
        notifs = [{'title': 'Grid Maintenance', 'message': 'Scheduled check on Sunday.', 'date': datetime.utcnow()}]
    else:
        # Get notifications for everyone or specifically for this meter
        notifs = list(db.notifications.find({'$or': [{'target': 'all'}, {'target': meter_id}]}).sort('date', -1))
    
    for n in notifs:
        if '_id' in n: n['_id'] = str(n['_id'])
    return jsonify(notifs)

@app.route('/api/user/profile', methods=['GET', 'PUT'])
@token_required
def manage_profile(current_user):
    if request.method == 'GET':
        user_data = {
            'name': current_user.get('name'),
            'email': current_user.get('email'),
            'phone': current_user.get('phone', ''),
            'address': current_user.get('address', ''),
            'meter_id': current_user.get('meter_id')
        }
        return jsonify(user_data)
    
    if request.method == 'PUT':
        data = request.json
        if USE_MOCK: return jsonify({'message': 'Profile updated (Mock)'})
        
        db.users.update_one(
            {'_id': current_user['_id']},
            {'$set': {
                'name': data.get('name'),
                'phone': data.get('phone'),
                'address': data.get('address')
            }}
        )
        return jsonify({'message': 'Profile updated successfully'})

@app.route('/api/user/password', methods=['POST'])
@token_required
def change_password(current_user):
    data = request.json
    new_password = data.get('new_password')
    if not new_password: return jsonify({'message': 'Password required'}), 400
    
    if USE_MOCK: return jsonify({'message': 'Password changed (Mock)'})
    
    hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
    db.users.update_one({'_id': current_user['_id']}, {'$set': {'password': hashed}})
    return jsonify({'message': 'Password changed successfully'})

@app.route('/api/messages', methods=['GET', 'POST'])
@token_required
def manage_messages(current_user):
    if request.method == 'GET':
        if USE_MOCK: return jsonify([])
        # Find messages where user is sender or recipient
        msgs = list(db.messages.find({
            '$or': [
                {'sender': current_user['email']},
                {'recipient': current_user['email']}
            ]
        }).sort('timestamp', 1))
        for m in msgs: m['_id'] = str(m['_id'])
        return jsonify(msgs)
    
    if request.method == 'POST':
        data = request.json
        if USE_MOCK: return jsonify({'message': 'Sent (Mock)'})
        
        new_msg = {
            'sender': current_user['email'],
            'recipient': data.get('recipient', 'admin@gov.ae'),
            'content': data.get('content'),
            'timestamp': datetime.utcnow(),
            'read': False
        }
        db.messages.insert_one(new_msg)
        return jsonify({'message': 'Message sent'})

@app.route('/api/admin/broadcast', methods=['POST'])
@token_required
def broadcast_notif(current_user):
    if current_user['role'] != 'admin': return jsonify({'message': 'Unauthorized'}), 403
    data = request.json
    
    if USE_MOCK: return jsonify({'message': 'Broadcast sent (Mock)'})
    
    notif = {
        'target': data.get('target', 'all'),
        'title': data.get('title'),
        'message': data.get('message'),
        'date': datetime.utcnow()
    }
    db.notifications.insert_one(notif)
    return jsonify({'message': 'Broadcast successful'})

@app.route('/api/user/anomalies', methods=['GET'])
@token_required
def get_user_anomalies(current_user):
    meter_id = current_user.get('meter_id')
    if USE_MOCK: return jsonify([])
    anoms = list(db.anomalies.find({'meter_id': meter_id}).sort('timestamp', -1))
    for a in anoms: a['_id'] = str(a['_id'])
    return jsonify(anoms)

@app.route('/api/readings/submit', methods=['POST'])
def submit_reading():
    data = request.json
    meter_id = data.get('meter_id')
    load = data.get('load')
    if not meter_id or load is None:
        return jsonify({'message': 'Missing meter_id or load'}), 400
        
    timestamp = datetime.utcnow()
    
    from ai_engine import ai_engine
    active_appliances = ai_engine.recognize_appliances(load)
    
    new_reading = {
        'meter_id': meter_id,
        'timestamp': timestamp,
        'load': float(load),
        'active_appliances': active_appliances
    }
    
    if not USE_MOCK:
        db.readings.insert_one(new_reading)
    else:
        new_reading['_id'] = ObjectId()
        mock_readings.insert(0, new_reading)
        
    is_anomaly = ai_engine.detect_anomaly(load)
    if is_anomaly:
        district = "Unknown"
        if not USE_MOCK:
            user = db.users.find_one({'meter_id': meter_id})
            if user:
                district = user.get('district', 'Unknown')
        else:
            user = next((u for u in mock_users if u.get('meter_id') == meter_id), None)
            if user:
                district = user.get('district', 'Unknown')
                
        anomaly_record = {
            'meter_id': meter_id,
            'timestamp': timestamp,
            'type': 'Consumption Spike / Theft Attempt',
            'severity': 'High',
            'location': district
        }
        
        if not USE_MOCK:
            db.anomalies.insert_one(anomaly_record)
            
    return jsonify({
        'message': 'Reading processed successfully',
        'active_appliances': active_appliances,
        'anomaly_detected': is_anomaly
    })

@app.route('/api/user/forecast', methods=['GET'])
@token_required
def get_user_forecast(current_user):
    meter_id = current_user.get('meter_id')
    if not meter_id:
        return jsonify({'message': 'No meter assigned'}), 400
        
    if USE_MOCK:
        history_readings = [r for r in mock_readings if r['meter_id'] == meter_id]
    else:
        history_readings = list(db.readings.find({'meter_id': meter_id}).sort('timestamp', 1))
        
    loads = [float(r['load']) for r in history_readings]
    
    from ai_engine import ai_engine
    forecast_list = ai_engine.forecast_demand(loads)
    
    return jsonify({
        'forecast': forecast_list
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
