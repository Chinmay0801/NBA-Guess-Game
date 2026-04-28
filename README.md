# 🏀 Ball Don't Cry

**Ball Don't Cry** is a daily, Wordle-style NBA player guessing game. It challenges basketball fans to deduce a mystery active NBA player based on their career stats, team history, and physical attributes. 

![Game Screenshot](https://raw.githubusercontent.com/Chinmay0801/NBA-Guess-Game/main/screenshot.png) *(Note: Add a screenshot.png to your repo later!)*

## 🌟 Features
- **Daily Mode**: A new mystery player is chosen every single day. Everyone across the world gets the exact same player! Try to guess them in 4 tries or less.
- **Practice Mode**: Want to hone your skills? Play unlimited random games without affecting your official stats.
- **Career Stats Table**: Instead of just basic attributes, you are given the player's full career stat-line table (Points, Rebounds, Assists, FG%, etc.) with the team names blurred out.
- **Dynamic Clues**: Unlock the player's Rookie Team on your first incorrect guess, and completely unblur their entire team history on your second miss. You can also unlock Age/Jersey and College clues!
- **Persistent Stats**: Your browser locally tracks your Games Played, Win Percentage, Current Streak, and Max Streak.

## 🛠️ Architecture & Tech Stack
Unlike most guessing games that require an expensive server to hit the NBA API constantly, **Ball Don't Cry** is engineered as a **100% static frontend application**. 

- **Frontend**: HTML5, CSS3, Vanilla JavaScript.
- **Data Engine**: A custom Python script (`build_db.py`) leveraging `nba_api` to scrape and compile the massive career histories of all 530+ active NBA players into a single `data.json` file.
- **Hosting**: Deployed on **Vercel** with zero server costs, resulting in instant load times.
- **Pseudo-Random Engine**: The Daily Mode uses a deterministic `cyrb128` hashing algorithm based on the user's local date. This guarantees a synchronized daily puzzle without needing a backend server to dictate it!

## 🚀 How to Run Locally

If you want to run the game on your own machine:

1. Clone the repository:
   ```bash
   git clone https://github.com/Chinmay0801/NBA-Guess-Game.git
   cd NBA-Guess-Game
   ```
2. Start a local Python server to serve the JSON and HTML:
   ```bash
   python -m http.server 8000
   ```
3. Open your browser and go to `http://localhost:8000`

## 📊 Updating the Database
To fetch the latest stats from the current NBA season, you can rebuild the `data.json` file. 
*(Note: Requires Python and `pip install nba_api pandas`)*

```bash
python build_db.py
python fix_data.py
```
*(The build script pauses for 0.4 seconds per player to avoid rate-limiting by the NBA. Expect the build to take ~6 minutes.)*
