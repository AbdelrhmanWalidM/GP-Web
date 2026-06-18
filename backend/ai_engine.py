import os
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib

class AIEngine:
    def __init__(self):
        self.models_loaded = False
        
        # Paths to the models relative to backend directory
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        self.forecast_model_path = os.path.join(base_dir, 'ai_models', 'forcast', 'initial_model.keras')
        self.forecast_scaler_path = os.path.join(base_dir, 'ai_models', 'forcast', 'scaler.pkl')
        
        self.anomaly_ae_path = os.path.join(base_dir, 'ai_models', 'anomaly model', 'ae_model.h5')
        self.anomaly_iso_path = os.path.join(base_dir, 'ai_models', 'anomaly model', 'iso.pkl')
        self.anomaly_scaler_path = os.path.join(base_dir, 'ai_models', 'anomaly model', 'scaler.pkl')
        
        # Fallback/Mock Setup (always initialized as backup)
        self.mock_anomaly_model = IsolationForest(contamination=0.1)
        self.mock_anomaly_model.fit(np.random.normal(1.0, 0.2, (100, 1)))

        try:
            # We import tensorflow inside try-except block to make it safe if tensorflow is not installed or runs out of memory
            import tensorflow as tf
            from tensorflow.keras.models import load_model, Model
            
            print("--- Loading AI Models ---")
            # 1. Load Forecast model & scaler
            if os.path.exists(self.forecast_model_path) and os.path.exists(self.forecast_scaler_path):
                self.forecast_model = tf.keras.models.load_model(self.forecast_model_path)
                self.forecast_scaler = joblib.load(self.forecast_scaler_path)
            else:
                raise FileNotFoundError("Forecast model or scaler file missing")

            # 2. Load Anomaly model (Autoencoder & Isolation Forest)
            if (os.path.exists(self.anomaly_ae_path) and 
                os.path.exists(self.anomaly_iso_path) and 
                os.path.exists(self.anomaly_scaler_path)):
                
                ae_model = load_model(self.anomaly_ae_path, compile=False)
                # Rebuild encoder
                self.anomaly_encoder = Model(inputs=ae_model.input, outputs=ae_model.layers[3].output)
                self.anomaly_iso = joblib.load(self.anomaly_iso_path)
                self.anomaly_scaler = joblib.load(self.anomaly_scaler_path)
            else:
                raise FileNotFoundError("Anomaly model, encoder, or scaler file missing")
                
            self.models_loaded = True
            print("--- AI Models Loaded Successfully ---")
        except Exception as e:
            print(f"Warning: Could not load real AI models ({e}). Using fallback/mock mode.")
            self.models_loaded = False

    def detect_anomaly(self, reading):
        """Detects if a reading is anomalous (theft or leakage)"""
        if not self.models_loaded:
            pred = self.mock_anomaly_model.predict([[reading]])
            return True if pred[0] == -1 else False
            
        try:
            # For a single reading, create the required feature set structure.
            now = pd.Timestamp.now()
            day = now.day
            day_of_year = now.dayofyear
            week_of_year = now.weekofyear
            hour = now.hour
            day_of_week = now.dayofweek
            is_weekend = 1 if now.day_name() in ['Saturday', 'Sunday'] else 0
            month = now.month
            
            # Since we only have one reading, we mock the rolling metrics.
            usage_change = 0
            rolling_mean_3 = reading
            rolling_std_3 = 0
            usage_diff_3h = 0
            
            features = np.array([[
                reading, day, day_of_year, week_of_year, hour, day_of_week, is_weekend,
                usage_change, rolling_mean_3, rolling_std_3, usage_diff_3h, month
            ]])
            
            # Scale
            features_scaled = self.anomaly_scaler.transform(features)
            # Encode
            z = self.anomaly_encoder.predict(features_scaled, verbose=0)
            # Predict
            pred = self.anomaly_iso.predict(z)
            return True if pred[0] == -1 else False
        except Exception as e:
            print(f"Anomaly inference failed: {e}. Falling back to mock model.")
            pred = self.mock_anomaly_model.predict([[reading]])
            return True if pred[0] == -1 else False

    def forecast_demand(self, history):
        """Forecast demand for next hour/sequence. If history is available, run prediction."""
        if not self.models_loaded or len(history) < 168:
            # Fallback to simple average if not enough history
            if len(history) < 3:
                return 1.2
            return np.mean(history[-3:]) + np.random.normal(0, 0.05)
            
        try:
            # Prepare df_input format
            now = pd.Timestamp.now()
            timestamps = [now - pd.Timedelta(hours=i) for i in range(168)][::-1]
            df_input = pd.DataFrame({
                'timestamp': timestamps,
                'usage_kWh': history[-168:]
            })
            
            # Feature engineering
            df_input['day'] = df_input['timestamp'].dt.day
            df_input['month'] = df_input['timestamp'].dt.month
            df_input['day_of_week'] = df_input['timestamp'].dt.dayofweek
            df_input['day_of_year'] = df_input['timestamp'].dt.dayofyear
            df_input['week_of_year'] = df_input['timestamp'].dt.isocalendar().week
            df_input['hour'] = df_input['timestamp'].dt.hour
            df_input['is_weekend'] = df_input['timestamp'].dt.day_name().isin(['Saturday','Sunday']).astype(int)
            df_input['usage_change'] = df_input['usage_kWh'].diff().fillna(0)
            df_input['rolling_mean_3'] = df_input['usage_kWh'].rolling(3).mean().fillna(method='bfill')
            df_input['rolling_std_3'] = df_input['usage_kWh'].rolling(3).std().fillna(method='bfill')
            df_input['usage_diff_3h'] = df_input['usage_kWh'].diff(3).fillna(0)
            
            features_cols = [
                'usage_kWh', 'day', 'day_of_year', 'week_of_year',
                'hour', 'day_of_week', 'is_weekend',
                'usage_change', 'rolling_mean_3', 'rolling_std_3',
                'usage_diff_3h', 'month'
            ]
            
            df_prepared = df_input[features_cols].interpolate().fillna(method="bfill").fillna(method="ffill")
            last_seq = df_prepared.values[-168:]
            scaled_seq = self.forecast_scaler.transform(last_seq)
            x = scaled_seq.reshape(1, 168, -1)
            
            pred_scaled = self.forecast_model.predict(x, verbose=0)[0]
            
            # Reconstruct first step usage
            reconstructed = np.zeros((168, scaled_seq.shape[1]))
            reconstructed[:, 0] = pred_scaled
            
            pred = self.forecast_scaler.inverse_transform(reconstructed)[:, 0]
            return float(pred[0])
        except Exception as e:
            print(f"Forecast prediction failed: {e}. Falling back to simple forecast.")
            if len(history) < 3:
                return 1.2
            return np.mean(history[-3:]) + np.random.normal(0, 0.05)

    def recognize_appliances(self, total_load):
        """
        NILM Simulation: Identifies active appliances based on load signature.
        """
        active = []
        if total_load > 0.05: active.append("Router")
        if total_load > 0.3: active.append("Refrigerator")
        if total_load > 1.0: active.append("Air Conditioner")
        if total_load > 1.5: active.append("Electric Oven")
        return active

# Singleton instance
ai_engine = AIEngine()