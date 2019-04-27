import io from 'socket.io-client';

function init() {
  const socket = io('http://localhost:5000');
  socket.on('connect', () => {
    console.log('connected to server');
  });

  socket.on('send keys', d => console.log(d));

  setInterval(() => socket.emit('get keys'), 500);
}

window.onload = init();
