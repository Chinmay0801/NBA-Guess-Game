// State
let allPlayers = [];
let targetPlayer = null;
let currentGuesses = 0;
const MAX_GUESSES = 4;
let guessing = false;
let isDailyMode = true;

// Stats Persistence
let userStats = JSON.parse(localStorage.getItem('nbaStats')) || {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0
};

// Daily State Persistence
let dailyState = JSON.parse(localStorage.getItem('nbaDailyState')) || {
  date: "",
  guesses: [],
  status: "playing",
  clue1Unlocked: false,
  clue2Unlocked: false
};

// DOM Elements
const searchInput = document.getElementById('player-search');
const autocompleteList = document.getElementById('autocomplete-list');
const guessBtn = document.getElementById('guess-btn');
const guessesBody = document.getElementById('guesses-body');
const guessesCountText = document.getElementById('guesses-count');

// Mode Toggle
const btnDaily = document.getElementById('mode-daily');
const btnPractice = document.getElementById('mode-practice');

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

// Pseudo-Random Hash for Daily
function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return (h1^h2^h3^h4)>>>0;
}

function getDailyRandomIndex(max) {
  // Use today's date local to the user
  const today = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD'
  const seed = cyrb128(today + "BALLDONTCRY_NBA");
  const rand = (seed * 1664525 + 1013904223) % 4294967296;
  return rand % max;
}

async function fetchPlayersList() {
  searchInput.placeholder = "Loading game data...";
  searchInput.disabled = true;
  guessBtn.disabled = true;
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error("Could not load data.json");
    allPlayers = await res.json();
    
    // Filter out players with absolutely no stats
    allPlayers = allPlayers.filter(p => p.stats_history && p.stats_history.length > 0);
    
    // Sort so array is deterministic every time
    allPlayers.sort((a,b) => a.id - b.id);

    searchInput.placeholder = "Guess the player...";
    searchInput.disabled = false;
    guessBtn.disabled = false;
  } catch (err) {
    console.error("Failed to load players list", err);
    searchInput.placeholder = "Error loading data.json";
  }
}

function switchMode(isDaily) {
  isDailyMode = isDaily;
  if (isDaily) {
    btnDaily.classList.add('active');
    btnPractice.classList.remove('active');
  } else {
    btnPractice.classList.add('active');
    btnDaily.classList.remove('active');
  }
  initGame();
}

btnDaily.addEventListener('click', () => { if(!isDailyMode) switchMode(true); });
btnPractice.addEventListener('click', () => { if(isDailyMode) switchMode(false); });

function initGame() {
  if (allPlayers.length === 0) return;

  currentGuesses = 0;
  guessing = false;
  
  // Reset UI
  guessesCountText.textContent = `${currentGuesses}/${MAX_GUESSES}`;
  searchInput.value = '';
  autocompleteList.innerHTML = '';
  autocompleteList.classList.add('hidden');
  guessesBody.innerHTML = '';
  careerStatsBody.innerHTML = '';
  
  btnClue1.disabled = true;
  btnClue2.disabled = true;
  resultModal.classList.add('hidden');
  
  // Clues setup
  btnClue1.disabled = false;
  btnClue2.disabled = false;
  clue1Text.classList.add('hidden');
  clue2Text.classList.add('hidden');

  if (isDailyMode) {
    // Check if daily needs reset
    const today = new Date().toLocaleDateString('en-CA');
    if (dailyState.date !== today) {
      dailyState = {
        date: today,
        guesses: [],
        status: "playing",
        clue1Unlocked: false,
        clue2Unlocked: false
      };
      saveDailyState();
    }
    const idx = getDailyRandomIndex(allPlayers.length);
    targetPlayer = allPlayers[idx];
  } else {
    // Practice
    const randIndex = Math.floor(Math.random() * allPlayers.length);
    targetPlayer = allPlayers[randIndex];
  }

  clue1Text.textContent = `Age: ${targetPlayer.age} | Jersey: #${targetPlayer.jerseyNumber}`;
  clue2Text.textContent = `Origin/College: ${targetPlayer.college || 'Unknown'}`;

  // Display Career Stats Table
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

  searchInput.disabled = false;
  guessBtn.disabled = false;
  searchInput.focus();

  // If daily mode, restore previous guesses and state
  if (isDailyMode) {
    if (dailyState.clue1Unlocked) unlockClue(1, false);
    if (dailyState.clue2Unlocked) unlockClue(2, false);
    
    // Evaluate restored guesses without saving them again
    for (let g of dailyState.guesses) {
      const p = allPlayers.find(x => x.name === g);
      if (p) processGuessLogic(p, true);
    }
  }
}

// Clue Listeners
btnClue1.addEventListener('click', () => unlockClue(1, true));
btnClue2.addEventListener('click', () => unlockClue(2, true));

function unlockClue(num, doSave) {
  if (num === 1) {
    clue1Text.classList.remove('hidden');
    btnClue1.disabled = true;
    if (isDailyMode && doSave) { dailyState.clue1Unlocked = true; saveDailyState(); }
  } else {
    clue2Text.classList.remove('hidden');
    btnClue2.disabled = true;
    if (isDailyMode && doSave) { dailyState.clue2Unlocked = true; saveDailyState(); }
  }
}

function saveDailyState() {
  localStorage.setItem('nbaDailyState', JSON.stringify(dailyState));
}

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

function handleGuess() {
  if (guessing || currentGuesses >= MAX_GUESSES) return;
  
  const guessName = searchInput.value.trim();
  const guessedPlayer = allPlayers.find(p => p.name.toLowerCase() === guessName.toLowerCase());
  
  if (!guessedPlayer) {
    alert("Player not found! Select from the dropdown.");
    return;
  }
  
  guessing = true;
  searchInput.value = '';
  autocompleteList.classList.add('hidden');
  
  if (isDailyMode) {
    dailyState.guesses.push(guessedPlayer.name);
    saveDailyState();
  }

  processGuessLogic(guessedPlayer, false);
}

function processGuessLogic(guessed, isRestoring) {
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
  
  // Pos
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
  if (currentGuesses >= 1 && !isCorrect) {
    const firstRowTeamCell = careerStatsBody.querySelector('tr td.team-blur');
    if (firstRowTeamCell) {
      firstRowTeamCell.classList.remove('team-blur');
      firstRowTeamCell.style.color = '#38bdf8';
    }
  }

  // Unlock All Teams on second miss
  if (currentGuesses >= 2 && !isCorrect) {
    const blurCells = careerStatsBody.querySelectorAll('.team-blur');
    blurCells.forEach(cell => {
      cell.classList.remove('team-blur');
      cell.style.color = '#38bdf8';
    });
  }

  guessing = false;
  
  if (isCorrect) {
    endGame(true, isRestoring);
  } else if (currentGuesses >= MAX_GUESSES) {
    endGame(false, isRestoring);
  }
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

function endGame(isWin, isRestoring) {
  searchInput.disabled = true;
  guessBtn.disabled = true;
  
  // Update Stats ONLY if Daily Mode and NOT restoring from previous session
  if (isDailyMode && !isRestoring && dailyState.status === "playing") {
    userStats.played++;
    if (isWin) {
      userStats.wins++;
      userStats.currentStreak++;
      if (userStats.currentStreak > userStats.maxStreak) {
        userStats.maxStreak = userStats.currentStreak;
      }
      dailyState.status = "won";
    } else {
      userStats.currentStreak = 0;
      dailyState.status = "lost";
    }
    localStorage.setItem('nbaStats', JSON.stringify(userStats));
    saveDailyState();
  }

  if (isWin) {
    resultTitle.textContent = "You Win!";
    resultTitle.style.color = "#22c55e";
    resultMessage.textContent = `You deduced ${targetPlayer.name} correctly.`;
  } else {
    resultTitle.textContent = "Game Over";
    resultTitle.style.color = "#ef4444";
    resultMessage.textContent = `The player was ${targetPlayer.name}.`;
    
    // Unblur the table
    const blurCells = document.querySelectorAll('.team-blur');
    blurCells.forEach(cell => cell.classList.remove('team-blur'));
  }
  
  // Hide play again button if in daily mode
  if (isDailyMode) {
    playAgainBtn.classList.add('hidden');
    resultMessage.innerHTML += `<br><br><small>Come back tomorrow for the next daily challenge!</small>`;
  } else {
    playAgainBtn.classList.remove('hidden');
  }

  resultModal.classList.remove('hidden');
}

playAgainBtn.addEventListener('click', () => {
  if (!isDailyMode) initGame();
});

// Initialization
window.onload = async () => {
    await fetchPlayersList();
    initGame();
};
