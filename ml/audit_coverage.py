import pandas as pd
from config import MATCH_STATS_CSV, DATA_DIR

df = pd.read_csv(MATCH_STATS_CSV, parse_dates=['date'], encoding='latin1')
print('Competitions in match_stats.csv:')
print(df['competition'].value_counts().to_string())
print(f'\nTotal unique players: {df["player_id"].nunique()}')

pl_players = set(df[df['competition'] == 'PL']['player_id'].unique())
all_players = set(df['player_id'].unique())
cup_only = all_players - pl_players
print(f'PL players: {len(pl_players)}')
print(f'Cup-only players (never in PL): {len(cup_only)}')

profile_f = pd.read_csv(DATA_DIR / 'profile_features.csv')
profile_players = set(profile_f['player_id'].unique())

# Who's missing from players.csv?
missing_from_profile = all_players - profile_players
cup_only_missing = cup_only & missing_from_profile
pl_missing = pl_players & missing_from_profile

print(f'\nMissing from players.csv total: {len(missing_from_profile)}')
print(f'  Cup-only players missing: {len(cup_only_missing)}')
print(f'  PL players missing: {len(pl_missing)}')
