import numpy as np
import pandas as pd
import joblib
from tensorflow.keras.models import load_model, Model

# ================= CONFIG =================
MODEL_PATH = "ae_model.h5"
ISO_PATH = "iso.pkl"
SCALER_PATH = "scaler.pkl"

FEATURES = [
    'usage_kWh',
    'day', 'day_of_year', 'week_of_year',
    'hour', 'day_of_week', 'is_weekend',
    'usage_change', 'rolling_mean_3', 'rolling_std_3',
    'usage_diff_3h', 'month'
]

# ================= FEATURE ENGINEERING =================
def add_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df=df.rename(columns={'datetime':'timestamp'})
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp').reset_index(drop=True)

    df['day'] = df['timestamp'].dt.day
    df['day_name'] = df['timestamp'].dt.day_name()
    df['month'] = df['timestamp'].dt.month
    df['day_of_week'] = df['timestamp'].dt.dayofweek
    df['day_of_year'] = df['timestamp'].dt.dayofyear
    df['week_of_year'] = df['timestamp'].dt.isocalendar().week
    df['hour'] = df['timestamp'].dt.hour

    df['is_weekend'] = df['day_name'].isin(['Saturday', 'Sunday']).astype(int)

    df['usage_change'] = df['usage_kWh'].diff().fillna(0)
    df['rolling_mean_3'] = df['usage_kWh'].rolling(3).mean().fillna(method='bfill')
    df['rolling_std_3'] = df['usage_kWh'].rolling(3).std().fillna(method='bfill')
    df['usage_diff_3h'] = df['usage_kWh'].diff(3).fillna(0)

    return df


def prepare_input(df: pd.DataFrame) -> np.ndarray:
    df = add_features(df)

    df = df[FEATURES]
    df = df.interpolate().fillna(method="bfill").fillna(method="ffill")

    return df.values


# ================= LOAD MODELS =================
def load_all():
    print("Loading models...")

    model = load_model(MODEL_PATH, compile=False)

    # Rebuild encoder (same layer index used in training)
    encoder = Model(
        inputs=model.input,
        outputs=model.layers[3].output
    )

    iso = joblib.load(ISO_PATH)
    scaler = joblib.load(SCALER_PATH)

    return model, encoder, iso, scaler


# ================= INFERENCE =================
def detect_anomalies(df: pd.DataFrame):
    """
    Input:
        df must contain:
        ['timestamp', 'usage_kWh']

    Output:
        DataFrame with anomaly predictions
    """

    model, encoder, iso, scaler = load_all()

    # Prepare features
    X = prepare_input(df)

    # Scale (IMPORTANT: only transform)
    X_scaled = scaler.transform(X)

    # Latent representation
    Z = encoder.predict(X_scaled, verbose=0)

    # Isolation Forest prediction
    preds = iso.predict(Z)              # -1 anomaly, +1 normal

    # Convert to 0/1
    anomaly_flag = (preds == -1).astype(int)

    # Build result
    result_df = df.copy()
    result_df['anomaly'] = anomaly_flag

    return result_df


# ================= EXAMPLE =================
if __name__ == "__main__":

    # Load new unseen data
    df = pd.read_csv("year2.csv")  # must have timestamp + usage_kWh

    results = detect_anomalies(df.iloc[:1])

    print(results.head())

