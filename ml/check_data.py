import pandas as pd
from config import INJURIES_CSV, ML_FEATURES_CSV

def check_data():
    print("--- INJURIES.CSV STATS ---")
    injuries = pd.read_csv(INJURIES_CSV, parse_dates=["start_date"])
    injuries['year'] = injuries['start_date'].dt.year
    injuries['month'] = injuries['start_date'].dt.month
    print("Injuries by year:")
    print(injuries['year'].value_counts().sort_index())
    
    print("\n2025 injuries by month:")
    print(injuries[injuries['year'] == 2025]['month'].value_counts().sort_index())
    print(injuries[injuries['year'] == 2026]['month'].value_counts().sort_index())
    
    print("\n--- ML_FEATURES.CSV STATS ---")
    df = pd.read_csv(ML_FEATURES_CSV, parse_dates=["date"])
    print("Rows by season:")
    print(df['season'].value_counts().sort_index())
    
    target_col = [c for c in df.columns if c.startswith('injured_next_')][0]
    print(f"\nTarget column: {target_col}")
    
    print("\nPositive rate by season:")
    print(df.groupby('season')[target_col].mean())
    
    # Check max date and cutoff
    max_inj_date = injuries['start_date'].max()
    print(f"\nMax injury start_date: {max_inj_date}")
    print("Date range for 2025 season rows:")
    s2025 = df[df['season'] == 2025]
    print(f"Min: {s2025['date'].min()}, Max: {s2025['date'].max()}")

if __name__ == '__main__':
    check_data()
