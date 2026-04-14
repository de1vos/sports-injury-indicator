"""Quick test: fetch the latest completed Premier League 2025/26 match."""

import json
import requests
from config import HEADERS, BASE_URL

resp = requests.get(
    f"{BASE_URL}/fixtures",
    headers=HEADERS,
    params={"league": 39, "season": 2025, "last": 1},
)
data = resp.json()

print(f"Status: {resp.status_code}")
print(f"API errors: {data.get('errors')}")
print(f"Results: {data.get('results')}")
print()

if data.get("response"):
    match = data["response"][0]
    fix   = match["fixture"]
    teams = match["teams"]
    goals = match["goals"]

    print(f"Fixture ID: {fix['id']}")
    print(f"Date:       {fix['date']}")
    print(f"Venue:      {fix['venue']['name']}, {fix['venue']['city']}")
    print(f"Match:      {teams['home']['name']} {goals['home']} - {goals['away']} {teams['away']['name']}")
    print(f"Status:     {fix['status']['long']}")
    print()
    print("Full response:")
    print(json.dumps(match, indent=2))
else:
    print("No results — check your API key and that the 2025 season exists.")
    print("Full response:")
    print(json.dumps(data, indent=2))
