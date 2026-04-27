"""
Static primary-color map for clubs that appear in predictions.json.
Covers 2025/26 PL sides plus relegated/promoted clubs present in historical data.

Keys are the exact team name strings returned by API-Football (verified via
`jq -r '.[].team' output/predictions.json | sort -u`).
"""

TEAM_COLORS: dict[str, str] = {
    "Arsenal":           "#EF0107",
    "Aston Villa":       "#95BFE5",
    "Bournemouth":       "#DA291C",
    "Brentford":         "#D20000",
    "Brighton":          "#0057B8",
    "Burnley":           "#6C1D45",
    "Chelsea":           "#034694",
    "Crystal Palace":    "#1B458F",
    "Everton":           "#003399",
    "Fulham":            "#000000",
    "Ipswich":           "#3764A4",
    "Leeds":             "#FFCD00",
    "Leicester":         "#003090",
    "Liverpool":         "#C8102E",
    "Luton":             "#F78F1E",
    "Manchester City":   "#6CABDD",
    "Manchester United": "#DA291C",
    "Newcastle":         "#BBBCBC",
    "Nottingham Forest": "#DD0000",
    "Sheffield Utd":     "#EE2737",
    "Southampton":       "#D71920",
    "Sunderland":        "#EB172C",
    "Tottenham":         "#132257",
    "West Ham":          "#7A263A",
    "Wolves":            "#F6B000",
}

FALLBACK_COLOR = "#888888"


def team_color(team_name: str) -> str:
    color = TEAM_COLORS.get(team_name)
    if color is None:
        print(f"[WARN] no color mapping for team: '{team_name}'")
        return FALLBACK_COLOR
    return color
