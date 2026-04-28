import json
from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime
from nba_api.stats.static import players
from nba_api.stats.endpoints import commonplayerinfo, playercareerstats

app = Flask(__name__)
CORS(app)

# Cache active players on startup
all_players = players.get_players()
ACTIVE_PLAYERS = [p for p in all_players if p['is_active']]

def calc_age(birthdate_str):
    try:
        birth_year = int(birthdate_str[:4])
        return datetime.now().year - birth_year
    except:
        return 0

def fetch_player_data(player_id, name):
    try:
        info_resp = commonplayerinfo.CommonPlayerInfo(player_id=player_id)
        info = info_resp.get_normalized_dict()['CommonPlayerInfo'][0]

        career_resp = playercareerstats.PlayerCareerStats(player_id=player_id, per_mode36='PerGame')
        career = career_resp.get_normalized_dict()['SeasonTotalsRegularSeason']
        
        stats = []
        for season in career:
            gp = season.get("GP", 0)
            if gp == 0: continue
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

        return {
            "name": name,
            "id": player_id,
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
    except Exception as e:
        print(e)
        return None

@app.route('/api/players')
def get_players():
    # Return minimal info for autocomplete
    return jsonify([{"name": p['full_name'], "id": p['id']} for p in ACTIVE_PLAYERS])

import random
@app.route('/api/random_target')
def get_random_target():
    # Keep picking until we find someone with stats (avoid rookies who haven't played yet)
    while True:
        p = random.choice(ACTIVE_PLAYERS)
        data = fetch_player_data(p['id'], p['full_name'])
        if data and len(data['stats_history']) > 0:
            return jsonify(data)

@app.route('/api/player/<name>')
def get_player(name):
    # Find player in ACTIVE_PLAYERS
    p = next((x for x in ACTIVE_PLAYERS if x['full_name'].lower() == name.lower()), None)
    if not p:
        return jsonify({"error": "Player not found"}), 404
    data = fetch_player_data(p['id'], p['full_name'])
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
