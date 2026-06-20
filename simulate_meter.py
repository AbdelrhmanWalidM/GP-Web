import requests
import time
import random
import sys
from datetime import datetime

print("==================================================")
print("       SMART METER REAL-TIME telemetry SIMULATOR   ")
print("==================================================")

# Ask for the API URL, default to the user's Hugging Face Space URL
default_url = "https://abdelrhmannnn-smart-meter-api.hf.space"
api_base = input(f"Enter Hugging Face Space URL (default: {default_url}): ").strip()
if not api_base:
    api_base = default_url

# Clean the URL
api_base = api_base.rstrip("/")
api_url = f"{api_base}/api/readings/submit"

# Ask for the meter ID
default_meter = "MTR-001"
meter_id = input(f"Enter Meter ID to simulate (default: {default_meter}): ").strip()
if not meter_id:
    meter_id = default_meter

print("\n--- Simulation Configured ---")
print(f"Target Endpoint: {api_url}")
print(f"Simulating Meter: {meter_id}")
print("Press Ctrl+C to stop simulation at any time.\n")

reading_count = 0

try:
    while True:
        reading_count += 1
        
        # Every 6th reading, we simulate a Consumption Spike/Surge (Anomaly)
        if reading_count % 6 == 0:
            load = round(random.uniform(4.5, 6.5), 3) # Very high load (spike)
            print(f"[*] Simulating ANOMALOUS event (Consumption Spike)...")
        else:
            load = round(random.uniform(0.15, 1.85), 3) # Normal household load
            
        payload = {
            "meter_id": meter_id,
            "load": load
        }
        
        try:
            start_time = time.time()
            response = requests.post(api_url, json=payload, timeout=10)
            latency = round((time.time() - start_time) * 1000, 2)
            
            if response.status_code == 200:
                res_data = response.json()
                appliances = res_data.get("active_appliances", [])
                anomaly = res_data.get("anomaly_detected", False)
                
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Reading #{reading_count} Sent:")
                print(f"  - Load: {load} kW")
                print(f"  - Active Appliances (NILM): {', '.join(appliances) if appliances else 'None'}")
                print(f"  - Anomaly Detected: {'[YES - High Severity]' if anomaly else 'No'}")
                print(f"  - Latency: {latency} ms")
                print("-" * 50)
            else:
                print(f"[ERROR] Server returned status code {response.status_code}: {response.text}")
        except requests.exceptions.RequestException as e:
            print(f"[CONNECTION ERROR] Could not connect to API: {e}")
            
        time.sleep(6) # Send reading every 6 seconds
        
except KeyboardInterrupt:
    print("\n[!] Simulation stopped by user. Goodbye!")
    sys.exit(0)
