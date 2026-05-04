import json
import pandas as pd
from datetime import datetime

def inspect():
    with open('../data/raw/injuries_season_2025.json') as f:
        season_data = json.load(f)
        
    with open('../data/raw/sidelined.json') as f:
        sidelined_data = json.load(f)
        
    # Analyze Sidelined for Jan-Apr 2025
    sl_2025 = []
    for pid, records in sidelined_data.items():
        for r in records:
            if r.get('start') and r['start'].startswith('2025'):
                sl_2025.append(r)
                
    print(f"Total sidelined records in 2025: {len(sl_2025)}")
    
    # Analyze Season for 2025
    missing = [d for d in season_data if d.get('player', {}).get('type') == 'Missing Fixture']
    print(f"Total 'Missing Fixture' reports in season_data: {len(missing)}")
    
    # What are the reasons?
    reasons = [d.get('player', {}).get('reason') for d in missing]
    print("\nTop 10 Reasons in Missing Fixture:")
    print(pd.Series(reasons).value_counts().head(10))
    
    # Let's see how many of the Missing Fixture records have "vague" types
    VAGUE_TYPES = {"other", "fitness", "injured", "injury", "unknown", "ill", "doubtful", ""}
    vague_count = sum(1 for r in reasons if str(r).lower().strip() in VAGUE_TYPES)
    print(f"\nVague reports in season_data (would be dropped): {vague_count} out of {len(missing)}")

    # Let's count how many fixtures each team has in season_data
    # This might show if API provider just doesn't log injuries for all matches
    teams = [d.get('team', {}).get('name') for d in season_data]
    print("\nMatches logged per team in season_data:")
    print(pd.Series(teams).value_counts().head(5))
    print(pd.Series(teams).value_counts().tail(5))

    # Also, check the 'type' in season_data
    types = [d.get('player', {}).get('type') for d in season_data]
    print("\nPlayer types in season_data:")
    print(pd.Series(types).value_counts())

if __name__ == '__main__':
    inspect()
