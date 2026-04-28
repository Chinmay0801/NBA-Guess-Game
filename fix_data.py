import json

team_info = {
    "ATL": {"conf": "East", "div": "Southeast"},
    "BOS": {"conf": "East", "div": "Atlantic"},
    "BKN": {"conf": "East", "div": "Atlantic"},
    "CHA": {"conf": "East", "div": "Southeast"},
    "CHI": {"conf": "East", "div": "Central"},
    "CLE": {"conf": "East", "div": "Central"},
    "DAL": {"conf": "West", "div": "Southwest"},
    "DEN": {"conf": "West", "div": "Northwest"},
    "DET": {"conf": "East", "div": "Central"},
    "GSW": {"conf": "West", "div": "Pacific"},
    "HOU": {"conf": "West", "div": "Southwest"},
    "IND": {"conf": "East", "div": "Central"},
    "LAC": {"conf": "West", "div": "Pacific"},
    "LAL": {"conf": "West", "div": "Pacific"},
    "MEM": {"conf": "West", "div": "Southwest"},
    "MIA": {"conf": "East", "div": "Southeast"},
    "MIL": {"conf": "East", "div": "Central"},
    "MIN": {"conf": "West", "div": "Northwest"},
    "NOP": {"conf": "West", "div": "Southwest"},
    "NYK": {"conf": "East", "div": "Atlantic"},
    "OKC": {"conf": "West", "div": "Northwest"},
    "ORL": {"conf": "East", "div": "Southeast"},
    "PHI": {"conf": "East", "div": "Atlantic"},
    "PHX": {"conf": "West", "div": "Pacific"},
    "POR": {"conf": "West", "div": "Northwest"},
    "SAC": {"conf": "West", "div": "Pacific"},
    "SAS": {"conf": "West", "div": "Southwest"},
    "TOR": {"conf": "East", "div": "Atlantic"},
    "UTA": {"conf": "West", "div": "Northwest"},
    "WAS": {"conf": "East", "div": "Southeast"},
}

with open("data.json", "r") as f:
    db = json.load(f)

for p in db:
    team = p.get("team", "UNK")
    if team in team_info:
        p["conference"] = team_info[team]["conf"]
        p["division"] = team_info[team]["div"]
    else:
        p["conference"] = "Unknown"
        p["division"] = "Unknown"

with open("data.json", "w") as f:
    json.dump(db, f, indent=2)

print("Fixed conferences and divisions!")
