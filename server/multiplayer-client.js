// ============================================================
// multiplayer-client.js — Client-side WebSocket integration
// Phase 4 (T-037) — Connects to the multiplayer server
// ============================================================
// Usage:
//   Multiplayer.host('Teacher Name')        — create a room
//   Multiplayer.join('ROOMCODE', 'Player')  — join a room
//   Multiplayer.buzz()                       — press buzzer
//   Multiplayer.sendAnswer(qId, answer)      — send answer to host
//   Multiplayer.disconnect()                 — leave room
// ============================================================

window.Multiplayer = (function() {
  'use strict';

  // Default server URL — can be overridden via Multiplayer.setServer(url)
  let _serverUrl = (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.hostname + ':8080/ws';
  let _ws = null;
  let _isHost = false;
  let _roomCode = null;
  let _clientId = null;
  let _playerName = null;
  let _reconnectAttempts = 0;
  let _maxReconnectAttempts = 5;
  let _reconnectDelay = 1000;
  let _listeners = new Map();

  // ── Connect to server ──
  function _connect() {
    return new Promise((resolve, reject) => {
      if (_ws && _ws.readyState === WebSocket.OPEN) {
        resolve(_ws);
        return;
      }

      try {
        _ws = new WebSocket(_serverUrl);
      } catch (e) {
        reject(new Error('Failed to connect: ' + e.message));
        return;
      }

      _ws.onopen = () => {
        console.info('[MP] Connected to', _serverUrl);
        _reconnectAttempts = 0;
        resolve(_ws);
      };

      _ws.onmessage = (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch (e) {
          console.warn('[MP] Invalid message:', event.data);
          return;
        }
        _dispatch(msg.type, msg);
      };

      _ws.onerror = (err) => {
        console.error('[MP] WebSocket error:', err);
        reject(err);
      };

      _ws.onclose = (event) => {
        console.info('[MP] Disconnected:', event.code, event.reason);
        _dispatch('disconnected', { code: event.code, reason: event.reason });
        // Auto-reconnect if not intentional
        if (event.code !== 1000 && _reconnectAttempts < _maxReconnectAttempts) {
          _reconnectAttempts++;
          const delay = _reconnectDelay * _reconnectAttempts;
          console.info(`[MP] Reconnecting in ${delay}ms (attempt ${_reconnectAttempts})...`);
          setTimeout(() => _connect().catch(() => {}), delay);
        }
      };
    });
  }

  // ── Host a room ──
  async function host(hostName) {
    await _connect();
    _playerName = hostName || 'Host';
    _send({ type: 'create_room', hostName: _playerName });
  }

  // ── Join a room ──
  async function join(roomCode, playerName) {
    await _connect();
    _playerName = playerName || 'Player';
    _send({
      type: 'join_room',
      roomCode: roomCode.toUpperCase(),
      name: _playerName,
    });
  }

  // ── Leave room / disconnect ──
  function disconnect() {
    if (_ws) {
      _send({ type: 'leave_room' });
      _ws.close(1000, 'User disconnected');
      _ws = null;
    }
    _roomCode = null;
    _isHost = false;
    _clientId = null;
  }

  // ── Buzz (student) ──
  function buzz() {
    if (!_ws || _isHost) return;
    _send({ type: 'buzz' });
  }

  // ── Send answer (student) ──
  function sendAnswer(questionId, answer) {
    if (!_ws || _isHost) return;
    _send({ type: 'answer', questionId, answer });
  }

  // ── Update state (host only) ──
  function updateState(stateUpdate) {
    if (!_ws || !_isHost) return;
    _send({ type: 'state_update', state: stateUpdate });
  }

  // ── Send chat message ──
  function sendChat(text) {
    if (!_ws) return;
    _send({ type: 'chat', text });
  }

  // ── Event listener ──
  function on(event, callback) {
    if (!_listeners.has(event)) {
      _listeners.set(event, new Set());
    }
    _listeners.get(event).add(callback);
  }

  function off(event, callback) {
    if (_listeners.has(event)) {
      _listeners.get(event).delete(callback);
    }
  }

  function _dispatch(event, data) {
    if (_listeners.has(event)) {
      _listeners.get(event).forEach((cb) => {
        try { cb(data); } catch (e) { console.error('[MP] Listener error:', e); }
      });
    }
  }

  // ── Send helper ──
  function _send(obj) {
    if (_ws && _ws.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify(obj));
    }
  }

  // ── Auto-handle internal events ──
  on('connected', (msg) => { _clientId = msg.clientId; });
  on('room_created', (msg) => {
    _isHost = true;
    _roomCode = msg.roomCode;
    console.info('[MP] Room created:', _roomCode);
    if (typeof toast === 'function') toast('رمز الغرفة: ' + _roomCode, 'success');
  });
  on('joined', (msg) => {
    _isHost = false;
    _roomCode = msg.roomCode;
    _playerName = msg.playerName;
    console.info('[MP] Joined room:', _roomCode);
  });
  on('error', (msg) => {
    console.error('[MP] Server error:', msg.message);
    if (typeof toast === 'function') toast(msg.message, 'danger');
  });

  // ── Getters ──
  function getConnectionState() {
    if (!_ws) return 'disconnected';
    switch (_ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
    }
    return 'unknown';
  }

  function setServer(url) {
    _serverUrl = url;
  }

  return {
    host, join, disconnect,
    buzz, sendAnswer, updateState, sendChat,
    on, off,
    getConnectionState, setServer,
    get isConnected() { return _ws && _ws.readyState === WebSocket.OPEN; },
    get isHost() { return _isHost; },
    get roomCode() { return _roomCode; },
    get clientId() { return _clientId; },
    get playerName() { return _playerName; },
  };
})();

console.info('[MP] Multiplayer client v15.0 loaded');
