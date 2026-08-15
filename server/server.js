// ============================================================
// server.js — WebSocket Server for Multiplayer Quiz Mode
// Phase 4 (T-037) — Real-time multiplayer synchronization
// ============================================================
// A lightweight Node.js WebSocket server that enables:
//   1. Real-time quiz synchronization across multiple devices
//   2. Teacher-controlled quiz flow (next question, reveal answer)
//   3. Student buzzer with first-to-press detection
//   4. Live score updates broadcast to all participants
//
// Deployment:
//   - Local: `node server.js` (for classroom use on same WiFi)
//   - Production: deploy to Railway/Render/Fly.io with `PORT` env var
//
// Architecture:
//   - Each quiz session is a "room" identified by a 6-char code
//   - One teacher (host) controls the quiz
//   - Multiple students (players) join with the room code
//   - All messages are broadcast to room members except sender
// ============================================================

import { WebSocketServer } from 'ws';
import http from 'http';
import { randomBytes } from 'crypto';

const PORT = process.env.PORT || 8080;
const MAX_ROOMS = 100;
const MAX_PLAYERS_PER_ROOM = 50;
const ROOM_CODE_LENGTH = 6;
const HEARTBEAT_INTERVAL_MS = 30000;

// ── Room & Player State ──
const rooms = new Map();  // roomCode → { host, players: Map, state, createdAt }
const players = new Map();  // ws → { roomCode, name, isHost, id }

// ── HTTP Server (for health check + static info) ──
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      rooms: rooms.size,
      players: players.size,
      uptime: process.uptime(),
      version: 'v15.0',
    }));
    return;
  }

  if (req.url === '/stats') {
    const roomStats = Array.from(rooms.entries()).map(([code, room]) => ({
      code,
      playerCount: room.players.size,
      hasHost: !!room.host,
      createdAt: room.createdAt,
    }));
    res.writeHead(200);
    res.end(JSON.stringify({ rooms: roomStats, total: roomStats.length }));
    return;
  }

  // Default: server info
  res.writeHead(200);
  res.end(JSON.stringify({
    name: 'Arabic Quiz Builder — Multiplayer Server',
    version: 'v15.0',
    endpoints: ['/health', '/stats'],
    websocket: `ws://${req.headers.host}`,
  }));
});

// ── WebSocket Server ──
const wss = new WebSocketServer({ server, path: '/ws' });

console.info(`[Server] V15.0 Multiplayer WebSocket Server starting on port ${PORT}...`);

wss.on('connection', (ws, req) => {
  const clientId = randomBytes(8).toString('hex');
  console.info(`[WS] Client connected: ${clientId} from ${req.socket.remoteAddress}`);

  // Send connection acknowledgment
  _send(ws, { type: 'connected', clientId, serverVersion: 'v15.0' });

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (e) {
      _send(ws, { type: 'error', message: 'Invalid JSON' });
      return;
    }

    switch (msg.type) {
      case 'create_room':
        _handleCreateRoom(ws, clientId, msg);
        break;
      case 'join_room':
        _handleJoinRoom(ws, clientId, msg);
        break;
      case 'leave_room':
        _handleLeaveRoom(ws);
        break;
      case 'buzz':
        _handleBuzz(ws, msg);
        break;
      case 'answer':
        _handleAnswer(ws, msg);
        break;
      case 'state_update':
        _handleStateUpdate(ws, msg);
        break;
      case 'chat':
        _handleChat(ws, msg);
        break;
      default:
        // Broadcast unknown message types to room (extensibility)
        _broadcastToRoom(ws, msg, true);
    }
  });

  ws.on('close', () => {
    console.info(`[WS] Client disconnected: ${clientId}`);
    _handleLeaveRoom(ws);
  });

  ws.on('error', (err) => {
    console.error(`[WS] Client error: ${clientId}`, err);
    _handleLeaveRoom(ws);
  });

  // Heartbeat: mark connection as alive
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});

// ── Heartbeat (detect dead connections) ──
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL_MS);

// ── Room Management ──
function _generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  // No confusing chars (0/O, 1/I)
  let code;
  do {
    code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (rooms.has(code));
  return code;
}

function _handleCreateRoom(ws, clientId, msg) {
  if (rooms.size >= MAX_ROOMS) {
    _send(ws, { type: 'error', message: 'Server at capacity. Try again later.' });
    return;
  }

  const roomCode = _generateRoomCode();
  const room = {
    code: roomCode,
    host: ws,
    hostName: msg.hostName || 'Host',
    players: new Map(),
    state: {
      currentView: 'lobby',
      currentQuestion: null,
      currentTeamIndex: 0,
      scores: {},
      buzzerQueue: [],
      quizState: {},
    },
    createdAt: Date.now(),
  };

  rooms.set(roomCode, room);
  players.set(ws, { roomCode, name: msg.hostName || 'Host', isHost: true, id: clientId });

  _send(ws, {
    type: 'room_created',
    roomCode,
    clientId,
    isHost: true,
  });
  console.info(`[Room] Created: ${roomCode} by ${msg.hostName || 'Host'}`);
}

function _handleJoinRoom(ws, clientId, msg) {
  const { roomCode, name } = msg;
  const room = rooms.get(roomCode);

  if (!room) {
    _send(ws, { type: 'error', message: `Room ${roomCode} not found` });
    return;
  }

  if (room.players.size >= MAX_PLAYERS_PER_ROOM) {
    _send(ws, { type: 'error', message: 'Room is full' });
    return;
  }

  const playerName = name || `Player ${room.players.size + 1}`;
  players.set(ws, { roomCode, name: playerName, isHost: false, id: clientId });
  room.players.set(clientId, { ws, name: playerName, score: 0 });

  // Notify joiner
  _send(ws, {
    type: 'joined',
    roomCode,
    clientId,
    isHost: false,
    playerName,
    playerCount: room.players.size + 1,
    state: room.state,
  });

  // Notify room (host + all players)
  _broadcastToRoom(ws, {
    type: 'player_joined',
    playerId: clientId,
    playerName,
    playerCount: room.players.size + 1,
  }, false);  // Include sender (so they know they're registered)

  console.info(`[Room] ${playerName} joined ${roomCode} (${room.players.size + 1} players)`);
}

function _handleLeaveRoom(ws) {
  const player = players.get(ws);
  if (!player) return;

  const room = rooms.get(player.roomCode);
  if (!room) {
    players.delete(ws);
    return;
  }

  if (player.isHost) {
    // Host left — close room and notify all players
    _broadcastToRoom(ws, {
      type: 'room_closed',
      reason: 'Host disconnected',
    }, false);
    room.players.forEach((p) => players.delete(p.ws));
    rooms.delete(player.roomCode);
    players.delete(ws);
    console.info(`[Room] ${player.roomCode} closed (host left)`);
  } else {
    // Player left
    room.players.delete(player.id);
    players.delete(ws);
    _broadcastToRoom(ws, {
      type: 'player_left',
      playerId: player.id,
      playerName: player.name,
      playerCount: room.players.size + 1,
    }, false);
    console.info(`[Room] ${player.name} left ${player.roomCode} (${room.players.size + 1} players)`);
  }
}

function _handleBuzz(ws, msg) {
  const player = players.get(ws);
  if (!player || player.isHost) return;

  const room = rooms.get(player.roomCode);
  if (!room) return;

  // Add to buzzer queue (first-come-first-served)
  const buzzTime = Date.now();
  room.state.buzzerQueue.push({
    playerId: player.id,
    playerName: player.name,
    time: buzzTime,
  });

  // Notify host immediately (first buzzer wins)
  if (room.host && room.host.readyState === 1) {
    _send(room.host, {
      type: 'buzz',
      playerId: player.id,
      playerName: player.name,
      time: buzzTime,
      queuePosition: room.state.buzzerQueue.length,
    });
  }

  // Notify all players who buzzed
  _broadcastToRoom(ws, {
    type: 'buzz_update',
    queue: room.state.buzzerQueue.slice(0, 5),  // Top 5
  }, true);
}

function _handleAnswer(ws, msg) {
  const player = players.get(ws);
  if (!player) return;

  // Forward answer to host
  const room = rooms.get(player.roomCode);
  if (!room || !room.host) return;

  _send(room.host, {
    type: 'player_answer',
    playerId: player.id,
    playerName: player.name,
    questionId: msg.questionId,
    answer: msg.answer,
    time: Date.now(),
  });
}

function _handleStateUpdate(ws, msg) {
  const player = players.get(ws);
  if (!player || !player.isHost) {
    _send(ws, { type: 'error', message: 'Only host can update state' });
    return;
  }

  const room = rooms.get(player.roomCode);
  if (!room) return;

  // Merge state update
  if (msg.state) {
    Object.assign(room.state, msg.state);
  }

  // Broadcast to all players (not host)
  room.players.forEach((p) => {
    if (p.ws !== ws && p.ws.readyState === 1) {
      _send(p.ws, {
        type: 'state_update',
        state: room.state,
        timestamp: Date.now(),
      });
    }
  });
}

function _handleChat(ws, msg) {
  const player = players.get(ws);
  if (!player) return;

  _broadcastToRoom(ws, {
    type: 'chat',
    playerId: player.id,
    playerName: player.name,
    text: String(msg.text || '').slice(0, 200),  // Limit length
    timestamp: Date.now(),
  }, true);
}

// ── Helpers ──
function _send(ws, obj) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(obj));
  }
}

function _broadcastToRoom(senderWs, msg, includeSender = false) {
  const player = players.get(senderWs);
  if (!player) return;

  const room = rooms.get(player.roomCode);
  if (!room) return;

  // Send to host (if not the sender)
  if (!includeSender && room.host !== senderWs && room.host.readyState === 1) {
    _send(room.host, msg);
  } else if (includeSender && room.host === senderWs && room.host.readyState === 1) {
    _send(room.host, msg);
  }

  // Send to all players
  room.players.forEach((p) => {
    if (includeSender || p.ws !== senderWs) {
      if (p.ws.readyState === 1) {
        _send(p.ws, msg);
      }
    }
  });
}

// ── Cleanup: Remove stale rooms (no activity for 2 hours) ──
setInterval(() => {
  const now = Date.now();
  const STALE_MS = 2 * 60 * 60 * 1000;
  for (const [code, room] of rooms) {
    if (now - room.createdAt > STALE_MS && room.players.size === 0) {
      rooms.delete(code);
      console.info(`[Room] Cleaned up stale room: ${code}`);
    }
  }
}, 10 * 60 * 1000);  // Every 10 minutes

// ── Start Server ──
server.listen(PORT, () => {
  console.info(`[Server] ✅ Listening on http://localhost:${PORT}`);
  console.info(`[Server] WebSocket: ws://localhost:${PORT}/ws`);
  console.info(`[Server] Health check: http://localhost:${PORT}/health`);
});

// ── Graceful Shutdown ──
process.on('SIGTERM', () => {
  console.info('[Server] SIGTERM received — shutting down...');
  wss.clients.forEach((ws) => ws.terminate());
  server.close(() => {
    console.info('[Server] Closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.info('[Server] SIGINT received — shutting down...');
  wss.clients.forEach((ws) => ws.terminate());
  server.close(() => process.exit(0));
});
