import confetti from 'confetti';

document.addEventListener('DOMContentLoaded', () => {
  // Game state variables
  let targetWord = '';
  let currentRow = 0;
  let currentTile = 0;
  let isGameOver = false;
  let gameStats = {
    gamesPlayed: 0,
    currentStreak: 0,
    bestStreak: 0
  };
  
  // Sound effects
  const tileFlipSound = new Audio('/tile_flip.mp3');
  const correctGuessSound = new Audio('/correct_guess.mp3');
  
  // Words list
  let wordsList = [];
  
  // Load words from WordleWords.txt
  fetch('/WordleWords.txt')
    .then(response => response.text())
    .then(text => {
      wordsList = text.split('\n').map(word => word.trim().toLowerCase()).filter(word => word.length === 5);
      initGame();
    })
    .catch(error => {
      console.error('Error loading words:', error);
      // Fallback words in case file can't be loaded
      wordsList = ['apple', 'brick', 'toast', 'happy', 'crane', 'panel', 'flame', 'wheat', 'tower', 'grape'];
      initGame();
    });
  
  // Load game stats from localStorage
  const loadGameStats = () => {
    const savedStats = localStorage.getItem('endlessWordleStats');
    if (savedStats) {
      gameStats = JSON.parse(savedStats);
      updateStatsDisplay();
    }
  };
  
  // Save game stats to localStorage
  const saveGameStats = () => {
    localStorage.setItem('endlessWordleStats', JSON.stringify(gameStats));
    updateStatsDisplay();
  };
  
  // Update stats display on screen
  const updateStatsDisplay = () => {
    document.getElementById('games-played').textContent = gameStats.gamesPlayed;
    document.getElementById('current-streak').textContent = gameStats.currentStreak;
    document.getElementById('best-streak').textContent = gameStats.bestStreak;
  };
  
  // Initialize the game board
  const initBoard = () => {
    const board = document.getElementById('board');
    board.innerHTML = '';
    
    for (let i = 0; i < 6; i++) {
      const row = document.createElement('div');
      row.classList.add('row');
      
      for (let j = 0; j < 5; j++) {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        tile.dataset.state = 'empty';
        row.appendChild(tile);
      }
      
      board.appendChild(row);
    }
  };
  
  // Choose a random word from the list
  const getRandomWord = () => {
    return wordsList[Math.floor(Math.random() * wordsList.length)];
  };
  
  // Initialize the game
  const initGame = () => {
    loadGameStats();
    initBoard();
    resetGame();
    
    // Set up keyboard and key event listeners
    document.querySelectorAll('#keyboard button').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.getAttribute('data-key');
        handleKeyPress(key);
      });
    });
    
    document.addEventListener('keydown', (e) => {
      if (isGameOver) return;
      
      const key = e.key.toLowerCase();
      if (key === 'enter') {
        handleKeyPress('enter');
      } else if (key === 'backspace') {
        handleKeyPress('backspace');
      } else if (/^[a-z]$/.test(key)) {
        handleKeyPress(key);
      }
    });
    
    document.getElementById('next-game').addEventListener('click', () => {
      document.getElementById('result-modal').style.display = 'none';
      resetGame();
    });
  };
  
  // Reset game to start a new round
  const resetGame = () => {
    targetWord = getRandomWord();
    currentRow = 0;
    currentTile = 0;
    isGameOver = false;
    
    // Clear the board
    document.querySelectorAll('.tile').forEach(tile => {
      tile.textContent = '';
      tile.className = 'tile';
      tile.dataset.state = 'empty';
      tile.dataset.letter = '';
    });
    
    // Clear keyboard status
    document.querySelectorAll('#keyboard button').forEach(button => {
      button.classList.remove('correct', 'present', 'absent');
    });
    
    console.log('Target word:', targetWord); // For testing
  };
  
  // Handle key presses
  const handleKeyPress = (key) => {
    if (isGameOver) return;
    
    if (key === 'enter') {
      submitGuess();
    } else if (key === 'backspace') {
      deleteLetter();
    } else if (/^[a-z]$/.test(key) && currentTile < 5) {
      addLetter(key);
    }
  };
  
  // Add a letter to the current tile
  const addLetter = (letter) => {
    if (currentTile < 5) {
      const row = document.querySelectorAll('.row')[currentRow];
      const tile = row.querySelectorAll('.tile')[currentTile];
      tile.textContent = letter;
      tile.classList.add('filled');
      tile.dataset.state = 'tbd';
      tile.dataset.letter = letter;
      currentTile++;
    }
  };
  
  // Delete the last letter
  const deleteLetter = () => {
    if (currentTile > 0) {
      currentTile--;
      const row = document.querySelectorAll('.row')[currentRow];
      const tile = row.querySelectorAll('.tile')[currentTile];
      tile.textContent = '';
      tile.classList.remove('filled');
      tile.dataset.state = 'empty';
      tile.dataset.letter = '';
    }
  };
  
  // Submit the current guess
  const submitGuess = () => {
    if (currentTile < 5) {
      shakeRow();
      return;
    }
    
    const row = document.querySelectorAll('.row')[currentRow];
    const tiles = row.querySelectorAll('.tile');
    let guess = '';
    
    for (let i = 0; i < tiles.length; i++) {
      guess += tiles[i].textContent;
    }
    
    guess = guess.toLowerCase();
    
    // Check if the guess is a valid word
    if (!wordsList.includes(guess)) {
      shakeRow();
      return;
    }
    
    // Evaluate the guess
    evaluateGuess(guess, tiles);
    
    currentRow++;
    currentTile = 0;
    
    // Check if the game is over
    if (guess === targetWord) {
      gameWon();
    } else if (currentRow >= 6) {
      gameLost();
    }
  };
  
  // Evaluate the guess against the target word
  const evaluateGuess = (guess, tiles) => {
    const wordMap = {};
    
    // Create a map of characters in the target word
    for (let i = 0; i < targetWord.length; i++) {
      const char = targetWord[i];
      if (wordMap[char]) {
        wordMap[char]++;
      } else {
        wordMap[char] = 1;
      }
    }
    
    // First pass - mark correct letters
    const evaluations = Array(5).fill(null);
    for (let i = 0; i < 5; i++) {
      const guessChar = guess[i];
      
      if (guessChar === targetWord[i]) {
        evaluations[i] = 'correct';
        wordMap[guessChar]--;
      }
    }
    
    // Second pass - mark present and absent letters
    for (let i = 0; i < 5; i++) {
      if (evaluations[i]) continue;
      
      const guessChar = guess[i];
      
      if (wordMap[guessChar] && wordMap[guessChar] > 0) {
        evaluations[i] = 'present';
        wordMap[guessChar]--;
      } else {
        evaluations[i] = 'absent';
      }
    }
    
    // Animate tiles and update keyboard
    flipTiles(tiles, evaluations);
  };
  
  // Animate the tiles flipping to reveal results
  const flipTiles = (tiles, evaluations) => {
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const letter = tile.textContent.toLowerCase();
      const keyButton = document.querySelector(`button[data-key="${letter}"]`);
      
      setTimeout(() => {
        tile.classList.add('flip');
        
        // Play flip sound
        tileFlipSound.currentTime = 0;
        tileFlipSound.play();
        
        setTimeout(() => {
          tile.classList.add(evaluations[i]);
          tile.dataset.state = evaluations[i];
          
          // Update keyboard button status
          if (evaluations[i] === 'correct') {
            keyButton.classList.remove('present', 'absent');
            keyButton.classList.add('correct');
          } else if (evaluations[i] === 'present' && !keyButton.classList.contains('correct')) {
            keyButton.classList.remove('absent');
            keyButton.classList.add('present');
          } else if (evaluations[i] === 'absent' && 
                    !keyButton.classList.contains('correct') && 
                    !keyButton.classList.contains('present')) {
            keyButton.classList.add('absent');
          }
        }, 250);
        
      }, i * 300);
    }
  };
  
  // Handle the row shaking animation for invalid guesses
  const shakeRow = () => {
    const row = document.querySelectorAll('.row')[currentRow];
    row.querySelectorAll('.tile').forEach(tile => {
      tile.classList.add('shake');
      setTimeout(() => {
        tile.classList.remove('shake');
      }, 600);
    });
  };
  
  // Game won handler
  const gameWon = () => {
    isGameOver = true;
    
    // Play correct guess sound
    correctGuessSound.currentTime = 0;
    correctGuessSound.play();
    
    // Update statistics
    gameStats.gamesPlayed++;
    gameStats.currentStreak++;
    if (gameStats.currentStreak > gameStats.bestStreak) {
      gameStats.bestStreak = gameStats.currentStreak;
    }
    saveGameStats();
    
    // Animate winning row
    const row = document.querySelectorAll('.row')[currentRow - 1];
    const tiles = row.querySelectorAll('.tile');
    
    setTimeout(() => {
      tiles.forEach((tile, i) => {
        setTimeout(() => {
          tile.classList.add('dance');
        }, i * 100);
      });
      
      // Show confetti
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      // Show win modal
      setTimeout(() => {
        showResultModal('Brilliant!', `You found the word: ${targetWord.toUpperCase()}`);
      }, 1500);
    }, 1500);
  };
  
  // Game lost handler
  const gameLost = () => {
    isGameOver = true;
    
    // Update statistics
    gameStats.gamesPlayed++;
    gameStats.currentStreak = 0;
    saveGameStats();
    
    // Show lose modal
    setTimeout(() => {
      showResultModal('Game Over', `The word was: ${targetWord.toUpperCase()}`);
    }, 1500);
  };
  
  // Show the result modal
  const showResultModal = (title, message) => {
    document.getElementById('result-message').textContent = title;
    document.getElementById('word-reveal').textContent = message;
    document.getElementById('result-modal').style.display = 'flex';
  };
});