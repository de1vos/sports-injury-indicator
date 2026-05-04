"""
Step 3.4 — Player profile features

Static features derived from players.csv.
One row per player.

Output: data/profile_features.csv
"""

import pandas as pd
from config import PLAYERS_CSV, DATA_DIR

OUTPUT_FILE = DATA_DIR / "profile_features.csv"

POSITION_ENCODING = {
    "Goalkeeper": 0,
    "Defender":   1,
    "Midfielder": 2,
    "Attacker":   3,
    "Forward":    3,   # some API responses use "Forward" instead of "Attacker"
}


def main():
    print("Loading players.csv...")
    df = pd.read_csv(PLAYERS_CSV)
    print(f"  {len(df)} players")

    out = pd.DataFrame()

    out["player_id"]        = df["player_id"]
    out["age_squared"]      = df["age"] ** 2
    out["position"]         = df["position"]
    out["position_encoded"] = df["position"].map(POSITION_ENCODING)
    out["nationality"]      = df["nationality"]

    out = out.sort_values("player_id").reset_index(drop=True)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUTPUT_FILE, index=False)

    print(f"\n{'─'*50}")
    print(f"Players:            {len(out)}")
    print(f"Age range:          {df['age'].min():.0f} – {df['age'].max():.0f}")
    print(f"Avg age:            {df['age'].mean():.1f}")
    print(f"Position breakdown: {df['position'].value_counts().to_dict()}")
    print(f"Missing position:   {out['position_encoded'].isna().sum()}")
    print(f"\nSaved: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
