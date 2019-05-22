import io from 'socket.io-client';
import { p1Words, p2Words, startWords } from './Words';

const STATES = {
  KEY: {
    UP: 'UP',
    DOWN: 'DOWN',
  },
};

const KEY_CHANGE_BUFFER = 150;
const LETTER_MAP = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
];

let socket;

// State stuff
let prevTime = 0;

let keyUpdateTime = 0;
const KEY_UPDATE_WINDOW = 20;
const keyStates = LETTER_MAP
  .map(l => ({
    letter: l,
    state: STATES.KEY.UP,
    frames: [],
    time: 0,
  }));

let gameState = 'START';

const startState = {
  word: 0,
  letter: 0,
  shakeTime: 0,
  shakeX: 0,
  shakeY: 0,
};

const endState = {
  word: 'RESET',
  letter: 0,
  shakeTime: 0,
  shakeX: 0,
  shakeY: 0,
};

const p1 = {
  id: '#player1',
  word: 0,
  letter: 0,
  offset: 0,
  shakeTime: 0,
  shakeX: 0,
  shakeY: 0,
};

const p2 = {
  id: '#player2',
  word: 0,
  letter: 0,
  offset: 0,
  shakeTime: 0,
  shakeX: 0,
  shakeY: 0,
};

/**
 * @param {*} pid : player id
 * @param {*} word : word to fill in
 */
function setWord(pid, word) {
  const playerWord = document.querySelector(`#player${pid}`);
  playerWord.innerHTML = word.split('')
    .map((letter, i) => `<span id="p${pid}-${i}" class="letter">${letter}</span>`)
    .join('');

  playerWord.querySelector(`#p${pid}-0`).classList.add('cursor');
}

function triggerEnd(player, pid) {
  gameState = 'END';
  document.querySelector('#start-word').classList.add('hidden');
  document.querySelector('#title').classList.add('hidden');

  document.querySelector('#player1').classList.add('hidden');
  document.querySelector('#player1-total').classList.add('hidden');
  document.querySelector('#player2').classList.add('hidden');
  document.querySelector('#player2-total').classList.add('hidden');

  document.querySelector('#end-word').classList.remove('hidden');
  document.querySelector('#end-content').classList.remove('hidden');

  endState.letter = 0;

  const endWord = document.querySelector('#end-word');
  endWord.innerHTML = endState.word.split('')
    .map((l, i) => `<span id="e-${i}" class="letter">${l}</span>`)
    .join('');

  endWord.querySelector('#e-0').classList.add('cursor');
  endWord.style.left = window.innerWidth / 2 - (endState.word.length * 20) + 'px';
}

function updateStartShake(dt) {
  const wordOffset = window.innerWidth / 2 - (startWords[startState.word].length * 20);
  const startElement = document.querySelector('#start-word');
  if (startState.shakeTime > 0) {
    startState.shakeTime -= dt;
    const shakeAmount = startState.shakeTime / 2 * 0.5;
    startElement.style.left = wordOffset + (Math.cos(shakeAmount) * startState.shakeX) + 'px';
    startElement.style.top = window.innerHeight / 2 + (Math.cos(shakeAmount) * startState.shakeY) + 'px';
  } else {
    startElement.style.left = wordOffset + 'px';
    startElement.style.top = window.innerHeight / 2 + 'px';
  }
}

function updateEndShake(dt) {
  const wordOffset = window.innerWidth / 2 - (endState.word.length * 20);
  const endElement = document.querySelector('#end-word');
  if (endState.shakeTime > 0) {
    endState.shakeTime -= dt;
    const shakeAmount = endState.shakeTime / 0.5 * 0.5;
    endElement.style.left = wordOffset + (Math.cos(shakeAmount) * endState.shakeX) + 'px';
    endElement.style.top = window.innerHeight / 2 + (Math.cos(shakeAmount) * endState.shakeY) + 'px';
  } else {
    endElement.style.left = wordOffset + 'px';
    endElement.style.top = window.innerHeight / 2 + 'px';
  }
}

function updatePlayerShake(dt, player, topOffset) {
  const playerEl = document.querySelector(player.id);
  if (player.shakeTime > 0) {
    player.shakeTime -= dt;
    const shakeAmount = player.shakeTime / 0.5 * 0.5;
    playerEl.style.left = window.innerWidth * 0.45 + (Math.cos(shakeAmount) * player.shakeX) + 'px';
    playerEl.style.top = topOffset + (Math.cos(shakeAmount) * player.shakeY) + 'px';
  } else {
    playerEl.style.left = window.innerWidth * 0.45 + 'px';
    playerEl.style.top = topOffset + 'px';
  }
}

function updateShake(dt) {
  // start shake
  switch (gameState) {
    case 'START':
      updateStartShake(dt);
      break;
    case 'END':
      updateEndShake(dt);
      break;
    case 'MAIN':
      updatePlayerShake(dt, p1, window.innerHeight / 2 - 50);
      updatePlayerShake(dt, p2, window.innerHeight / 2 + 50);
      break;
    default: break;
  }
}

function update() {
  // get delta time
  const currTime = Date.now();
  const dt = currTime - prevTime;
  prevTime = currTime;

  // Fetch key update from Aruco server
  keyUpdateTime -= dt;
  if (keyUpdateTime <= 0) {
    socket.emit('get keys');
    keyUpdateTime = KEY_UPDATE_WINDOW;
  }

  updateShake(dt);

  keyStates.forEach((k) => { k.time -= dt; });
  requestAnimationFrame(update);
}

function addClearedWord(player, word) {
  // 40 px
  const playerWords = document.querySelector(`${player.id}-total`);

  playerWords.innerHTML += word.split('')
    .map(letter => `<span class="letter-total">${letter}</span>`)
    .join('');

  playerWords.innerHTML += '<span class="letter-total"> </span>';

  player.offset += word.length * 40 + 40;
  playerWords.style.left = (window.innerWidth * 0.45 - player.offset) + 'px';
}

function setCursor(pid, lid) {
  const playerWord = document.querySelector(`#player${pid}`);

  const prevLetter = playerWord.querySelector(`#p${pid}-${lid - 1}`);
  if (prevLetter) {
    prevLetter.classList.remove('cursor');
    prevLetter.classList.add('cleared');
  }

  const letter = playerWord.querySelector(`#p${pid}-${lid}`);
  letter.classList.add('cursor');
}

// START STUFF
function triggerMain() {
  gameState = 'MAIN';
  document.querySelector('#title').classList.add('hidden');
  document.querySelector('#start-word').classList.add('hidden');
  document.querySelector('#player1').classList.remove('hidden');
  document.querySelector('#player1-total').classList.remove('hidden');
  document.querySelector('#player2').classList.remove('hidden');
  document.querySelector('#player2-total').classList.remove('hidden');
  document.querySelector('#player1-total').innerHTML = '';
  document.querySelector('#player2-total').innerHTML = '';

  p1.word = 0;
  p1.letter = 0;
  p1.offset = 0;
  p2.word = 0;
  p2.letter = 0;
  p2.offset = 0;

  setWord(1, p1Words[p1.word]);
  setWord(2, p2Words[p2.word]);
  setCursor(1, p1.letter);
  setCursor(2, p2.letter);
}

function checkStartLetter(letter) {
  if (startWords[startState.word][startState.letter] === letter) {
    startState.letter += 1;
    startState.shakeX = Math.random() > 0.5 ? 1 : -1;
    startState.shakeY = Math.random() > 0.5 ? 1 : -1;
    startState.shakeTime = 100;
  }

  if (startState.letter >= startWords[startState.word].length) {
    startState.word += 1;
    startState.letter = 0;

    if (startState.word < startWords.length) {
      const startWord = document.querySelector('#start-word');
      startWord.innerHTML = startWords[startState.word].split('')
        .map((l, i) => `<span id="s-${i}" class="letter">${l}</span>`)
        .join('');

      startWord.querySelector('#s-0').classList.add('cursor');
      startWord.style.left = window.innerWidth / 2 - (startWords[startState.word].length * 20) + 'px';
    } else {
      // trigger win screen
      triggerMain();
      // bail
      return;
    }
  }

  const startWord = document.querySelector('#start-word');

  const prevLetter = startWord.querySelector(`#s-${startState.letter - 1}`);
  if (prevLetter) {
    prevLetter.classList.remove('cursor');
    prevLetter.classList.add('cleared');
  }

  const currLetter = startWord.querySelector(`#s-${startState.letter}`);
  currLetter.classList.add('cursor');
}
// END START STUFF

// END SCREEN STUFF
function triggerStart() {
  gameState = 'START';

  startState.word = 0;
  startState.letter = 0;
  // title too
  document.querySelector('#start-word').classList.remove('hidden');
  document.querySelector('#title').classList.remove('hidden');

  document.querySelector('#player1').classList.add('hidden');
  document.querySelector('#player1-total').classList.add('hidden');
  document.querySelector('#player2').classList.add('hidden');
  document.querySelector('#player2-total').classList.add('hidden');

  document.querySelector('#end-word').classList.add('hidden');
  document.querySelector('#end-content').classList.add('hidden');

  const startWord = document.querySelector('#start-word');
  startWord.innerHTML = startWords[startState.word].split('')
    .map((l, i) => `<span id="s-${i}" class="letter">${l}</span>`)
    .join('');

  startWord.querySelector('#s-0').classList.add('cursor');
  startWord.style.left = window.innerWidth / 2 - (startWords[startState.word].length * 20) + 'px';
}

function checkEndLetter(letter) {
  if (endState.word[endState.letter] === letter) {
    endState.letter += 1;
    endState.shakeX = Math.random() > 0.5 ? 1 : -1;
    endState.shakeY = Math.random() > 0.5 ? 1 : -1;
    endState.shakeTime = 100;
  }

  if (endState.letter >= endState.word.length) {
    endState.letter = 0;

    // trigger win screen
    triggerStart();
    // bail
    return;
  }

  const endWord = document.querySelector('#end-word');

  const prevLetter = endWord.querySelector(`#e-${endState.letter - 1}`);
  if (prevLetter) {
    prevLetter.classList.remove('cursor');
    prevLetter.classList.add('cleared');
  }

  const currLetter = endWord.querySelector(`#e-${endState.letter}`);
  currLetter.classList.add('cursor');
}

// mutates the player passed in
function checkLetter(letter, player, pid, wordList) {
  if (wordList[player.word][player.letter] === letter) {
    player.letter += 1;
    player.shakeTime = 100;
    player.shakeX = Math.random() > 0.5 ? 1 : -1;
    player.shakeY = Math.random() > 0.5 ? 1 : -1;
  }

  if (player.letter >= wordList[player.word].length) {
    player.word += 1;
    player.letter = 0;

    if (player.word < wordList.length) {
      setWord(pid, wordList[player.word]);
      addClearedWord(player, wordList[player.word - 1]);
    } else {
      // trigger win screen
      triggerEnd(player, pid);
      // bail
      return;
    }
  }

  setCursor(pid, player.letter);
}

function keyPress(e) {
  const letter = e.key.toUpperCase();
  switch (gameState) {
    case 'START':
      checkStartLetter(letter);
      break;
    case 'END':
      checkEndLetter(letter);
      break;
    case 'MAIN':
      checkLetter(letter, p1, 1, p1Words);
      checkLetter(letter, p2, 2, p2Words);
      break;
    default: break;
  }
}

function init() {
  socket = io('http://localhost:5000');
  socket.on('connect', () => {
    console.log('connected to server');
  });

  socket.on('send keys', (d) => {
    d.data
      .filter(id => id < keyStates.length)
      .forEach((id) => {
        const currKey = keyStates[id];
        if (currKey.state === STATES.KEY.UP && currKey.time <= 0) {
          currKey.state = STATES.KEY.DOWN;
          console.log(currKey.letter, 'is down');

          // call keypress function
          // checkLetter(currKey.letter, p1, 1, p1Words);
          // checkLetter(currKey.letter, p2, 2, p2Words);
          switch (gameState) {
            case 'START':
              checkStartLetter(currKey.letter);
              break;
            case 'END':
              checkEndLetter(currKey.letter);
              break;
            case 'MAIN':
              checkLetter(currKey.letter, p1, 1, p1Words);
              checkLetter(currKey.letter, p2, 2, p2Words);
              break;
            default: break;
          }
        }

        // reset key buffer if it's down
        if (currKey.state === STATES.KEY.DOWN) {
          currKey.time = KEY_CHANGE_BUFFER;
        }
      });

    keyStates.forEach((currKey, i) => {
      // check if key is in data
      if (!d.data.find((_, id) => id)) {
        if (currKey.time <= 0 && currKey.state === STATES.KEY.DOWN) {
          currKey.state = STATES.KEY.UP;
          currKey.time = KEY_CHANGE_BUFFER;
          console.log(currKey.letter, 'is up');
        }
      }
    });
  });

  // set up start
  triggerStart();

  document.body.addEventListener('keypress', keyPress);

  prevTime = Date.now();
  update();
}

window.onload = init();
