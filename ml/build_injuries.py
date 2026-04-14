"""
Step 2.4 — Build injuries.csv

One row per injury/sidelined event from sidelined.json.
Computes days_out, severity, and body_region for each record.
Output: data/injuries.csv
"""

import json
import pandas as pd
from datetime import datetime
from config import SIDELINED_FILE, INJURIES_CSV, SEVERITY_THRESHOLDS, BODY_REGION_MAP


def compute_days_out(start: str, end: str) -> int | None:
    """Return number of days between start and end date strings."""
    try:
        s = datetime.strptime(start, "%Y-%m-%d")
        e = datetime.strptime(end,   "%Y-%m-%d")
        return max(0, (e - s).days)
    except (ValueError, TypeError):
        return None


def get_severity(days: int | None) -> str | None:
    if days is None:
        return None
    for label, (low, high) in SEVERITY_THRESHOLDS.items():
        if low <= days <= high:
            return label
    return "Long-term"


def get_body_region(injury_type: str) -> str:
    if not injury_type:
        return "Other"
    lower = injury_type.lower()
    for keyword, region in BODY_REGION_MAP.items():
        if keyword in lower:
            return region
    return "Other"


def main():
    print("Loading sidelined.json...")
    with open(SIDELINED_FILE) as f:
        raw = json.load(f)
    print(f"  {len(raw)} players")

    rows = []

    for player_id, records in raw.items():
        for rec in records:
            injury_type = rec.get("type", "")
            start_date  = rec.get("start")
            end_date    = rec.get("end")

            days_out = compute_days_out(start_date, end_date) if end_date else None

            rows.append({
                "player_id":   int(player_id),
                "injury_type": injury_type,
                "start_date":  start_date,
                "end_date":    end_date,
                "days_out":    days_out,
                "severity":    get_severity(days_out),
                "body_region": get_body_region(injury_type),
            })

    df = pd.DataFrame(rows)

    if not df.empty:
        df["start_date"] = pd.to_datetime(df["start_date"], errors="coerce")
        df["end_date"]   = pd.to_datetime(df["end_date"],   errors="coerce")
        df = df.sort_values(["player_id", "start_date"]).reset_index(drop=True)

    INJURIES_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(INJURIES_CSV, index=False)

    print(f"\n{'─'*50}")
    print(f"Total records:          {len(df)}")
    print(f"Unique players:         {df['player_id'].nunique()}")
    print(f"Players with injuries:  {df[df['injury_type'] != '']['player_id'].nunique()}")
    print(f"Ongoing (no end date):  {df['end_date'].isna().sum()}")
    print(f"Avg days out:           {df['days_out'].mean():.1f}")
    print(f"Max days out:           {df['days_out'].max():.0f}")

    print(f"\nSeverity breakdown:")
    print(df["severity"].value_counts().to_string())

    print(f"\nTop 10 body regions:")
    print(df["body_region"].value_counts().head(10).to_string())

    print(f"\nTop 10 injury types:")
    print(df["injury_type"].value_counts().head(10).to_string())

    print(f"\nSaved: {INJURIES_CSV}")


if __name__ == "__main__":
    main()
