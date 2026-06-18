import os
from pymongo import MongoClient
import bcrypt
from datetime import datetime, timedelta
import random

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URI)
db = client['smart_meter_db']

def seed():
    # Clear all collections
    for coll in ['users', 'meters', 'readings', 'anomalies', 'billing', 'notifications', 'messages']:
        db[coll].delete_many({})

    # Password setup
    hashed = bcrypt.hashpw(b"password123", bcrypt.gensalt())

    # 1. SEED 5 METERS
    districts = ['Downtown', 'Marina', 'Business Bay', 'Palm District', 'New City']
    meter_data = []
    for i in range(1, 6):
        meter_data.append({
            'meter_id': f'MTR-00{i}',
            'model': random.choice(['Z-SMART-X1', 'Z-SMART-PRO']),
            'status': 'active',
            'district': districts[i-1],
            'install_date': datetime(2023, random.randint(1, 12), random.randint(1, 28))
        })
    db.meters.insert_many(meter_data)

    # 2. SEED 5 RESIDENTS + 1 ADMIN
    users = [
        {
            'email': 'admin@gov.ae', 
            'password': hashed, 
            'role': 'admin', 
            'name': 'Grid Administrator'
        }
    ]
    
    resident_names = ['Ahmed Mansour', 'Sara Al-Maktoum', 'Omar Khalid', 'Layla Hassan', 'Youssef Zayed']
    addresses = ['123 Nile Corniche, Cairo', 'Marina Tower, Alex', 'Zayed St, Giza', 'Heliopolis Blvd, Cairo', 'Fifth Settlement, Cairo']
    
    for i in range(1, 6):
        users.append({
            'email': f'resident{i}@home.com', 
            'password': hashed, 
            'role': 'resident', 
            'meter_id': f'MTR-00{i}', 
            'name': resident_names[i-1], 
            'phone': f'+20 100 {random.randint(1000000, 9999999)}',
            'address': addresses[i-1],
            'district': districts[i-1]
        })
    db.users.insert_many(users)

    # 3. SEED BILLING HISTORY (5 months for each user)
    bills = []
    months = ['January', 'February', 'March', 'April', 'May']
    for i in range(1, 6):
        m_id = f'MTR-00{i}'
        for m_idx, month in enumerate(months):
            # Most bills paid except the last one (May)
            status = 'paid' if m_idx < 4 else 'unpaid'
            usage = random.randint(150, 450)
            bills.append({
                'meter_id': m_id,
                'month': f"{month} 2026",
                'total_kwh': usage,
                'amount_due': round(usage * 1.45, 2), # ~1.45 EGP per kWh
                'status': status,
                'payment_date': datetime.now() - timedelta(days=random.randint(5, 30)) if status == 'paid' else None
            })
    db.billing.insert_many(bills)

    # 4. SEED READINGS & ANOMALIES (Hourly for current month)
    readings = []
    anomalies = []
    appliances_list = ['Refrigerator', 'Air Conditioner', 'Washing Machine', 'Smart TV', 'Water Heater', 'Oven']
    
    # Current month start
    now = datetime.now()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    for m in meter_data:
        m_id = m['meter_id']
        current_time = start_of_month
        while current_time <= now:
            readings.append({
                'meter_id': m_id,
                'timestamp': current_time,
                'load': round(random.uniform(0.1, 0.8), 3), # Small hourly load
                'active_appliances': random.sample(appliances_list, k=random.randint(1, 3))
            })
            current_time += timedelta(hours=1)
            
        # Also add some random historical anomalies
        for _ in range(3):
            anomalies.append({
                'meter_id': m_id,
                'timestamp': now - timedelta(days=random.randint(1, 20)),
                'type': random.choice(['Theft Attempt', 'Voltage Surge']),
                'severity': 'High',
                'location': m['district']
            })
    
    db.readings.insert_many(readings)
    db.anomalies.insert_many(anomalies)

    # 5. INITIAL CHAT MESSAGE
    db.messages.insert_one({
        'sender': 'admin@gov.ae',
        'recipient': 'resident1@home.com',
        'content': 'Welcome to the Smart City Grid. Please ensure your profile details are up to date.',
        'timestamp': datetime.utcnow(),
        'read': False
    })

    print(f"--- Enterprise Seeded: 6 Users, 5 Meters, {len(bills)} Bills ---")

if __name__ == "__main__":
    seed()
