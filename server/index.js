const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { GameServer } = require('./game/GameServer');
const { MAX_PLAYERS, MAP_NAME } = require('./config');

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const game = new GameServer();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    map: MAP_NAME,
    players: game.players.size,
    maxPlayers: MAX_PLAYERS,
    phase: game.phase,
  });
});

app.get('/api/status', (_req, res) => {
  res.json(game.getState());
});

app.post('/api/restart', (_req, res) => {
  const state = game.resetServer();
  io.emit('serverRestarted', { message: 'Servidor reiniciado', state });
  io.emit('state', state);
  res.json({ ok: true, state });
});

io.on('connection', (socket) => {
  socket.on('join', ({ name }) => {
    const result = game.addPlayer(socket.id, name);
    if (result.error) {
      socket.emit('error', result);
      return;
    }
    socket.emit('joined', result);
    io.emit('state', game.getState());
  });

  socket.on('selectTeam', ({ team }) => {
    const result = game.selectTeam(socket.id, team);
    if (result.error) {
      socket.emit('error', result);
      return;
    }
    io.emit('state', game.getState());
  });

  socket.on('autoSelectTeam', () => {
    const result = game.autoSelectTeam(socket.id);
    if (result.error) {
      socket.emit('error', result);
      return;
    }
    io.emit('state', game.getState());
  });

  socket.on('startMatch', () => {
    const result = game.tryStartMatch();
    if (result.error) {
      socket.emit('error', result);
      return;
    }
    io.emit('state', game.getState());
  });

  socket.on('buy', ({ itemId }) => {
    const result = game.buyItem(socket.id, itemId);
    if (result.error) {
      socket.emit('error', result);
      return;
    }
    socket.emit('bought', result);
    io.emit('state', game.getState());
  });

  socket.on('move', (data) => {
    const update = game.updatePosition(socket.id, data);
    if (update) {
      socket.emit('playerMoved', update);
      socket.broadcast.emit('playerMoved', update);
    }
  });

  socket.on('shoot', () => {
    const result = game.shoot(socket.id);
    if (!result) return;
    io.emit('shot', result);
    if (result.state) io.emit('state', result.state);
  });

  socket.on('reload', () => {
    const result = game.reload(socket.id);
    if (result) socket.emit('reloaded', result);
  });

  socket.on('jump', () => {
    const result = game.jump(socket.id);
    if (result?.error) return;
    io.emit('playerMoved', { id: socket.id, x: game.players.get(socket.id).x, y: game.players.get(socket.id).y, z: game.players.get(socket.id).z, rotY: game.players.get(socket.id).rotY, rotX: game.players.get(socket.id).rotX });
  });

  socket.on('plant', ({ active }) => {
    const result = game.setPlanting(socket.id, !!active);
    if (result?.error) {
      socket.emit('error', result);
      return;
    }
    io.emit('state', game.getState());
  });

  socket.on('defuse', ({ active }) => {
    const result = game.setDefusing(socket.id, !!active);
    if (result?.error) {
      socket.emit('error', result);
      return;
    }
    io.emit('state', game.getState());
  });

  socket.on('chat', ({ channel, text }) => {
    const result = game.sendChat(socket.id, { channel, text });
    if (result.error) {
      socket.emit('error', result);
      return;
    }
    for (const recipientId of result.recipients) {
      io.to(recipientId).emit('chat', result.message);
    }
    io.emit('state', game.getState());
  });

  socket.on('restartServer', () => {
    const state = game.resetServer();
    io.emit('serverRestarted', { message: 'Servidor reiniciado', by: socket.id });
    io.emit('state', state);
  });

  socket.on('ping_check', (ts) => socket.emit('pong_check', ts));

  socket.on('disconnect', () => {
    const state = game.removePlayer(socket.id);
    io.emit('state', state);
    io.emit('playerLeft', { id: socket.id });
  });
});

setInterval(() => {
  if (['live', 'buy', 'round_end'].includes(game.phase)) {
    io.emit('state', game.getState());
  }
}, 1000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[COUNTER_STRYKE] Servidor activo en puerto ${PORT}`);
  console.log(`[COUNTER_STRYKE] Mapa: ${MAP_NAME} | Máx jugadores: ${MAX_PLAYERS}`);
  console.log(`[COUNTER_STRYKE] Health: http://localhost:${PORT}/health`);
});
