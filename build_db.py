import json
import time
from datetime import datetime
from nba_api.stats.static import players
from nba_api.stats.endpoints import commonplayerinfo, playercareerstats

all_players = players.get_players()
active_players = [p for p in all_players if p['is_active']]

db = []

def calc_age(birthdate_str):
    try:
        birth_year = int(birthdate_str[:4])
        return datetime.now().year - birth_year
    except:
        return 0

print(f"Fetching data for {len(active_players)} players...")

for idx, p in enumerate(active_players):
    print(f"[{idx+1}/{len(active_players)}] Fetching {p['full_name']}...")
    try:
        info_resp = commonplayerinfo.CommonPlayerInfo(player_id=p['id'])
        info = info_resp.get_normalized_dict()['CommonPlayerInfo'][0]

        career_resp = playercareerstats.PlayerCareerStats(player_id=p['id'], per_mode36='PerGame')
        career = career_resp.get_normalized_dict()['SeasonTotalsRegularSeason']
        
        # Build Stats Array
        stats = []
        for season in career:
            gp = season.get("GP", 0)
            if gp == 0:
                continue
            stats.append({
                "Season": season["SEASON_ID"],
                "Team": season["TEAM_ABBREVIATION"],
                "G": gp,
                "MIN": round(season.get("MIN", 0), 1),
                "PTS": round(season.get("PTS", 0), 1),
                "REB": round(season.get("REB", 0), 1),
                "AST": round(season.get("AST", 0), 1),
                "FG_PCT": round(season.get("FG_PCT", 0) * 100, 1),
                "FG3M": round(season.get("FG3M", 0), 1),
                "FG3_PCT": round(season.get("FG3_PCT", 0) * 100, 1),
                "FT_PCT": round(season.get("FT_PCT", 0) * 100, 1),
                "STL": round(season.get("STL", 0), 1),
                "BLK": round(season.get("BLK", 0), 1),
                "TOV": round(season.get("TOV", 0), 1)
            })

        height_str = info.get("HEIGHT", "0-0")
        try:
            h_parts = height_str.split('-')
            height_inches = int(h_parts[0]) * 12 + int(h_parts[1])
            height_display = f"{h_parts[0]}'{h_parts[1]}\""
        except:
            height_inches = 0
            height_display = "?"

        try:
            draft_year = int(info.get("DRAFT_YEAR", "0") or 0)
        except:
            draft_year = "Undrafted"

        player_obj = {
            "name": p['full_name'],
            "team": info.get("TEAM_ABBREVIATION", "UNK"),
            "conference": info.get("TEAM_CONFERENCE", "East"),
            "division": info.get("TEAM_DIVISION", "Atlantic"),
            "position": info.get("POSITION", "F"),
            "heightInches": height_inches,
            "heightStr": height_display,
            "age": calc_age(info.get("BIRTHDATE", "")),
            "jerseyNumber": int(info.get("JERSEY", "0") or 0),
            "draftYear": draft_year,
            "draftPick": info.get("DRAFT_NUMBER", "Undrafted"),
            "college": info.get("SCHOOL", "Unknown"),
            "stats_history": stats
        }
        db.append(player_obj)
        time.sleep(0.4) # Prevent rate limiting
    except Exception as e:
        print(f"Error fetching {p['full_name']}: {e}")

# Save directly to JSON
with open("data.json", "w") as f:
    json.dump(db, f, indent=2)

print(f"Successfully built data.json with {len(db)} players!")
