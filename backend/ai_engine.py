import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest

class AIEngine:
    def __init__(self):
        # Initialize with some synthetic data for demo purposes
        self.anomaly_model = IsolationForest(contamination=0.1)
        # Mock training data
        train_data = np.random.normal(1.0, 0.2, (100, 1))
        self.anomaly_model.fit(train_data)

    def detect_anomaly(self, reading):
        """Detects if a reading is anomalous (theft or leakage)"""
        pred = self.anomaly_model.predict([[reading]])
        return True if pred[0] == -1 else False

    def forecast_demand(self, history):
        """Simple forecast: Average of last 3 readings with small noise"""
        if len(history) < 3:
            return 1.2
        return np.mean(history[-3:]) + np.random.normal(0, 0.05)

    def recognize_appliances(self, total_load):
        """
        NILM Simulation: Identifies active appliances based on load signature.
        In a real scenario, this would be a multi-label classifier.
        """
        active = []
        if total_load > 0.05: active.append("Router")
        if total_load > 0.3: active.append("Refrigerator")
        if total_load > 1.0: active.append("Air Conditioner")
        if total_load > 1.5: active.append("Electric Oven")
        return active

# Singleton instance
ai_engine = AIEngine()