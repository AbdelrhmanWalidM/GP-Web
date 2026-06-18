import numpy as np
import pandas as pd
import joblib
import tensorflow as tf

# -------------------------------------
# CONFIG (MUST MATCH TRAINING)
# -------------------------------------
SEQ_LEN = 168
PRED_HORIZON = 168

MODEL_PATH = "initial_model.keras"
SCALER_PATH = "scaler.pkl"

FEATURES = [
    'usage_kWh',
    'day', 'day_of_year', 'week_of_year',
    'hour', 'day_of_week', 'is_weekend',
    'usage_change', 'rolling_mean_3', 'rolling_std_3',
    'usage_diff_3h', 'month'
]

# -------------------------------------
# FEATURE ENGINEERING (SAME AS TRAIN)
# -------------------------------------
def add_features(hourly_df: pd.DataFrame) -> pd.DataFrame:
    hourly_df=hourly_df.rename(columns={'datetime':'timestamp'})
    hourly_df['timestamp'] = pd.to_datetime(hourly_df['timestamp'])
    hourly_df['day'] = hourly_df['timestamp'].dt.day
    hourly_df['day_name'] = hourly_df['timestamp'].dt.day_name()
    hourly_df['month'] = hourly_df['timestamp'].dt.month
    hourly_df['day_of_week'] = hourly_df['timestamp'].dt.dayofweek
    hourly_df['day_of_year'] = hourly_df['timestamp'].dt.dayofyear
    hourly_df['week_of_year'] = hourly_df['timestamp'].dt.isocalendar().week
    hourly_df['hour'] = hourly_df['timestamp'].dt.hour
    hourly_df['is_weekend'] = hourly_df['day_name'].isin(['Saturday','Sunday']).astype(int)

    hourly_df['usage_change'] = hourly_df['usage_kWh'].diff().fillna(0)
    hourly_df['rolling_mean_3'] = hourly_df['usage_kWh'].rolling(3).mean().fillna(method='bfill')
    hourly_df['rolling_std_3'] = hourly_df['usage_kWh'].rolling(3).std().fillna(method='bfill')
    hourly_df['usage_diff_3h'] = hourly_df['usage_kWh'].diff(3).fillna(0)

    return hourly_df


def prepare_df(df):
    df = add_features(df)
    df = df[FEATURES]
    df = df.interpolate().fillna(method="bfill").fillna(method="ffill")
    return df


# -------------------------------------
# LOAD MODEL + SCALER
# -------------------------------------
def load_model_and_scaler():
    model = tf.keras.models.load_model(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    return model, scaler


# -------------------------------------
# PREDICTION FUNCTION
# -------------------------------------
def predict_next_week(df_input: pd.DataFrame):
    """
    df_input must contain at least SEQ_LEN rows (168 hours)
    and include:
    ['timestamp', 'usage_kWh']
    """

    model, scaler = load_model_and_scaler()

    df_prepared = prepare_df(df_input)

    if len(df_prepared) < SEQ_LEN:
        raise ValueError(f"Need at least {SEQ_LEN} rows for prediction")

    # Take last sequence
    last_seq = df_prepared.values[-SEQ_LEN:]

    # Scale
    scaled_seq = scaler.transform(last_seq)

    # Reshape for model
    x = scaled_seq.reshape(1, SEQ_LEN, -1)

    # Predict
    pred_scaled = model.predict(x, verbose=0)[0]

    # Reconstruct full feature space (only usage is predicted)
    reconstructed = np.zeros((PRED_HORIZON, scaled_seq.shape[1]))
    reconstructed[:, 0] = pred_scaled

    # Inverse scaling
    pred = scaler.inverse_transform(reconstructed)[:, 0]

    return pred


# -------------------------------------
# EXAMPLE USAGE
# -------------------------------------
if __name__ == "__main__":

    # Example: load your latest data
    df = pd.read_csv("year2.csv")  # must contain timestamp + usage_kWh
    df=df.iloc[:168]

    predictions = predict_next_week(df)

    print("Next 168 hours prediction:")
    print(predictions)