// State
let allPlayers = [];
let targetPlayer = null;
let currentGuesses = 0;
const MAX_GUESSES = 4;
let guessing = false;
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
  ? 'http://127.0.0.1:5000/api' 
  : '/api';

let userStats = JSON.parse(localStorage.getItem('nbaStats')) || {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0
};

// DOM Elements
const searchInput = document.getElementById('player-search');
const autocompleteList = document.getElementById('autocomplete-list');
const guessBtn = document.getElementById('guess-btn');
const guessesBody = document.getElementById('guesses-body');
const guessesCountText = document.getElementById('guesses-count');

// Career Stats
const careerStatsBody = document.getElementById('career-stats-body');

// Clues
const btnClue1 = document.getElementById('unlock-clue-1');
const btnClue2 = document.getElementById('unlock-clue-2');
const clue1Text = document.getElementById('clue-1-text');
const clue2Text = document.getElementById('clue-2-text');

// Modal Elements
const resultModal = document.getElementById('result-modal');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');
const playAgainBtn = document.getElementById('play-again-btn');

// Stats Modal
const userStatsModal = document.getElementById('user-stats-modal');
const showStatsBtn = document.getElementById('show-stats-btn');
const closeStatsBtn = document.getElementById('close-stats-btn');
const statPlayed = document.getElementById('stat-played');
const statWinPct = document.getElementById('stat-winpct');
const statStreak = document.getElementById('stat-streak');
const statMaxStreak = document.getElementById('stat-maxstreak');

showStatsBtn.addEventListener('click', () => {
  statPlayed.textContent = userStats.played;
  statWinPct.textContent = userStats.played > 0 ? Math.round((userStats.wins / userStats.played) * 100) + '%' : '0%';
  statStreak.textContent = userStats.currentStreak;
  statMaxStreak.textContent = userStats.maxStreak;
  userStatsModal.classList.remove('hidden');
});

closeStatsBtn.addEventListener('click', () => {
  userStatsModal.classList.add('hidden');
});

async function fetchPlayersList() {
  searchInput.placeholder = "Loading players...";
  searchInput.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/players`);
    allPlayers = await res.json();
    searchInput.placeholder = "Guess the player...";
    searchInput.disabled = false;
  } catch (err) {
    console.error("Failed to load players list", err);
    searchInput.placeholder = "Error connecting to server";
  }
}

async function initGame() {
  currentGuesses = 0;
  guessing = false;
  
  // Reset UI
  guessesCountText.textContent = `${currentGuesses}/${MAX_GUESSES}`;
  searchInput.value = '';
  autocompleteList.innerHTML = '';
  autocompleteList.classList.add('hidden');
  guessesBody.innerHTML = '';
  careerStatsBody.innerHTML = '<tr><td colspan="14" style="text-align:center;">Loading random active player... (Takes ~2s)</td></tr>';
  
  btnClue1.disabled = true;
  btnClue2.disabled = true;
  searchInput.disabled = true;
  guessBtn.disabled = true;
  resultModal.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE}/random_target`);
    targetPlayer = await res.json();
  } catch (err) {
    careerStatsBody.innerHTML = '<tr><td colspan="14" style="text-align:center;">Failed to connect to Python server. Make sure it is running.</td></tr>';
    return;
  }
  
  // Display Career Stats Table
  careerStatsBody.innerHTML = '';
  if (targetPlayer.stats_history) {
    targetPlayer.stats_history.forEach(season => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${season.Season}</td>
        <td class="team-blur">${season.Team}</td>
        <td>${season.G}</td>
        <td>${season.MIN}</td>
        <td>${season.PTS}</td>
        <td>${season.REB}</td>
        <td>${season.AST}</td>
        <td>${season.FG_PCT}%</td>
        <td>${season.FG3M}</td>
        <td>${season.FG3_PCT}%</td>
        <td>${season.FT_PCT}%</td>
        <td>${season.STL}</td>
        <td>${season.BLK}</td>
        <td>${season.TOV}</td>
      `;
      careerStatsBody.appendChild(tr);
    });
  }

  // Reset Clues
  btnClue1.disabled = false;
  btnClue2.disabled = false;
  clue1Text.classList.add('hidden');
  clue2Text.classList.add('hidden');
  clue1Text.textContent = `Age: ${targetPlayer.age} | Jersey: #${targetPlayer.jerseyNumber}`;
  clue2Text.textContent = `Origin/College: ${targetPlayer.college || 'Unknown'}`;
  
  // Enable Inputs
  searchInput.disabled = false;
  guessBtn.disabled = false;
}

// Clue Listeners
btnClue1.addEventListener('click', () => {
  clue1Text.classList.remove('hidden');
  btnClue1.disabled = true;
});

btnClue2.addEventListener('click', () => {
  clue2Text.classList.remove('hidden');
  btnClue2.disabled = true;
});

// Autocomplete
searchInput.addEventListener('input', function() {
  const val = this.value;
  autocompleteList.innerHTML = '';
  if (!val) {
    autocompleteList.classList.add('hidden');
    return;
  }
  
  const matches = allPlayers.filter(p => p.name.toLowerCase().includes(val.toLowerCase()));
  if (matches.length > 0) {
    autocompleteList.classList.remove('hidden');
    matches.forEach(match => {
      const li = document.createElement('li');
      li.textContent = match.name;
      li.addEventListener('click', () => {
        searchInput.value = match.name;
        autocompleteList.classList.add('hidden');
      });
      autocompleteList.appendChild(li);
    });
  } else {
    autocompleteList.classList.add('hidden');
  }
});

document.addEventListener('click', (e) => {
  if (e.target !== searchInput) {
    autocompleteList.classList.add('hidden');
  }
});

guessBtn.addEventListener('click', handleGuess);
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleGuess();
});

async function handleGuess() {
  if (guessing || currentGuesses >= MAX_GUESSES) return;
  
  const guessName = searchInput.value.trim();
  const guessedPlayerBasic = allPlayers.find(p => p.name.toLowerCase() === guessName.toLowerCase());
  
  if (!guessedPlayerBasic) {
    alert("Player not found! Select from the dropdown.");
    return;
  }
  
  guessing = true;
  searchInput.value = '';
  autocompleteList.classList.add('hidden');
  guessBtn.disabled = true;
  guessBtn.textContent = '...';
  
  // Fetch the guessed player's full attributes from API
  try {
    const res = await fetch(`${API_BASE}/player/${encodeURIComponent(guessedPlayerBasic.name)}`);
    const guessedPlayer = await res.json();
    if (guessedPlayer.error) {
      alert("Error retrieving player data.");
      guessing = false;
      guessBtn.disabled = false;
      guessBtn.textContent = 'Guess';
      return;
    }
    evaluateGuess(guessedPlayer);
  } catch(err) {
    alert("API Error");
    guessing = false;
    guessBtn.disabled = false;
    guessBtn.textContent = 'Guess';
  }
}

function evaluateGuess(guessed) {
  const isCorrect = guessed.name === targetPlayer.name;
  
  const row = document.createElement('tr');
  
  // Name
  row.appendChild(createCell(guessed.name, isCorrect ? 'match-correct' : 'match-wrong'));
  
  // Team
  const teamMatch = guessed.team === targetPlayer.team ? 'match-correct' : 'match-wrong';
  row.appendChild(createCell(guessed.team, teamMatch));
  
  // Conf
  const confMatch = guessed.conference === targetPlayer.conference ? 'match-correct' : 'match-wrong';
  row.appendChild(createCell(guessed.conference, confMatch));
  
  // Div
  let divMatch = 'match-wrong';
  if (guessed.division === targetPlayer.division) {
    divMatch = 'match-correct';
  } else if (guessed.conference === targetPlayer.conference) {
    divMatch = 'match-partial';
  }
  row.appendChild(createCell(guessed.division, divMatch));
  
  // Pos - allowing partial if "G-F" matching "F" etc.
  let posMatch = 'match-wrong';
  if (guessed.position === targetPlayer.position) {
    posMatch = 'match-correct';
  } else if (guessed.position.includes(targetPlayer.position) || targetPlayer.position.includes(guessed.position)) {
    posMatch = 'match-partial';
  }
  row.appendChild(createCell(guessed.position, posMatch));
  
  // Height
  const hr = getNumberComparison(guessed.heightInches, targetPlayer.heightInches, guessed.heightStr);
  row.appendChild(createCell(hr.text, hr.matchClass));
  
  // Age
  const ar = getNumberComparison(guessed.age, targetPlayer.age, guessed.age);
  row.appendChild(createCell(ar.text, ar.matchClass));
  
  // Jersey Number
  const jr = getNumberComparison(guessed.jerseyNumber, targetPlayer.jerseyNumber, guessed.jerseyNumber);
  row.appendChild(createCell(jr.text, jr.matchClass));

  guessesBody.appendChild(row);
  
  currentGuesses++;
  guessesCountText.textContent = `${currentGuesses}/${MAX_GUESSES}`;

  // Unlock Rookie Team on first miss
  if (currentGuesses === 1 && !isCorrect) {
    const firstRowTeamCell = careerStatsBody.querySelector('tr td.team-blur');
    if (firstRowTeamCell) {
      firstRowTeamCell.classList.remove('team-blur');
      firstRowTeamCell.style.color = '#38bdf8';
    }
  }

  setTimeout(() => {
    guessing = false;
    guessBtn.disabled = false;
    guessBtn.textContent = 'Guess';
    if (isCorrect) {
      endGame(true);
    } else if (currentGuesses >= MAX_GUESSES) {
      endGame(false);
    }
  }, 100); 
}

function createCell(htmlContent, matchClass) {
  const td = document.createElement('td');
  td.innerHTML = htmlContent;
  td.className = `${matchClass}`;
  return td;
}

function getNumberComparison(guessedVal, targetVal, displayStr) {
  if (guessedVal === targetVal) {
    return { text: displayStr, matchClass: 'match-correct' };
  } else if (guessedVal < targetVal) {
    return { text: `${displayStr} <span class="arrow">↑</span>`, matchClass: 'match-wrong' };
  } else {
    return { text: `${displayStr} <span class="arrow">↓</span>`, matchClass: 'match-wrong' };
  }
}

function endGame(isWin) {
  searchInput.disabled = true;
  guessBtn.disabled = true;
  
  // Update Stats
  userStats.played++;
  if (isWin) {
    userStats.wins++;
    userStats.currentStreak++;
    if (userStats.currentStreak > userStats.maxStreak) {
      userStats.maxStreak = userStats.currentStreak;
    }
    resultTitle.textContent = "You Win!";
    resultTitle.style.color = "#22c55e";
    resultMessage.textContent = `You deduced ${targetPlayer.name} correctly.`;
  } else {
    userStats.currentStreak = 0;
    resultTitle.textContent = "Game Over";
    resultTitle.style.color = "#ef4444";
    resultMessage.textContent = `The player was ${targetPlayer.name}.`;
    
    // Unblur the table
    const blurCells = document.querySelectorAll('.team-blur');
    blurCells.forEach(cell => cell.classList.remove('team-blur'));
  }
  
  localStorage.setItem('nbaStats', JSON.stringify(userStats));
  resultModal.classList.remove('hidden');
}

playAgainBtn.addEventListener('click', initGame);

// Initialization
window.onload = async () => {
    await fetchPlayersList();
    initGame();
};
