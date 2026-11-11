import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

// Types for multiplayer
interface Room {
  id: string;
  code: string;
  players: SocketPlayer[];
  gameState: any;
  createdAt: number;
  timerPreset: string;
  isPrivate: boolean;
}

interface SocketPlayer {
  socketId: string;
  name: string;
  rating: number;
  ready: boolean;
}

interface MatchmakingEntry {
  socketId: string;
  name: string;
  rating: number;
  timerPreset: string;
  joinedAt: number;
}

// Server state
const rooms = new Map<string, Room>();
const roomsByCode = new Map<string, string>(); // code -> roomId
const matchmakingQueue: MatchmakingEntry[] = [];
const playerRatings = new Map<string, number>(); // socketId -> rating

const PORT = process.env.PORT || 3001;

const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'Scrabble Multiplayer Server Running',
    rooms: rooms.size,
    queueSize: matchmakingQueue.length,
    uptime: process.uptime(),
  }));
});

const io = new SocketServer(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
  },
});

// Generate a short room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Find a match in the queue within rating range
function findMatch(entry: MatchmakingEntry, maxDiff: number): MatchmakingEntry | null {
  for (let i = 0; i < matchmakingQueue.length; i++) {
    const candidate = matchmakingQueue[i];
    if (candidate.socketId === entry.socketId) continue;
    if (candidate.timerPreset !== entry.timerPreset) continue;
    if (Math.abs(candidate.rating - entry.rating) <= maxDiff) {
      matchmakingQueue.splice(i, 1);
      return candidate;
    }
  }
  return null;
}

// ELO rating calculation
function calculateNewRatings(winnerRating: number, loserRating: number, K = 32): { winner: number; loser: number } {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));
  return {
    winner: Math.round(winnerRating + K * (1 - expectedWinner)),
    loser: Math.round(loserRating + K * (0 - expectedLoser)),
  };
}

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Create a private room
  socket.on('create-room', ({ playerName, timerPreset }: { playerName: string; timerPreset: string }) => {
    const roomId = uuidv4();
    const code = generateRoomCode();

    const room: Room = {
      id: roomId,
      code,
      players: [{
        socketId: socket.id,
        name: playerName,
        rating: playerRatings.get(socket.id) || 1200,
        ready: false,
      }],
      gameState: null,
      createdAt: Date.now(),
      timerPreset,
      isPrivate: true,
    };

    rooms.set(roomId, room);
    roomsByCode.set(code, roomId);
    socket.join(roomId);

    socket.emit('room-created', { roomId, code, timerPreset });
    console.log(`Room created: ${code} by ${playerName}`);
  });

  // Join a room by code
  socket.on('join-room', ({ code, playerName }: { code: string; playerName: string }) => {
    const roomId = roomsByCode.get(code.toUpperCase());
    if (!roomId) {
      socket.emit('join-error', { message: 'Room not found. Check the code and try again.' });
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('join-error', { message: 'Room no longer exists.' });
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('join-error', { message: 'Room is full.' });
      return;
    }

    room.players.push({
      socketId: socket.id,
      name: playerName,
      rating: playerRatings.get(socket.id) || 1200,
      ready: false,
    });

    socket.join(roomId);
    io.to(roomId).emit('player-joined', {
      players: room.players.map(p => ({ name: p.name, rating: p.rating, ready: p.ready })),
    });

    console.log(`${playerName} joined room ${code}`);
  });

  // Join matchmaking queue
  socket.on('find-match', ({ playerName, timerPreset }: { playerName: string; timerPreset: string }) => {
    const rating = playerRatings.get(socket.id) || 1200;

    const entry: MatchmakingEntry = {
      socketId: socket.id,
      name: playerName,
      rating,
      timerPreset,
      joinedAt: Date.now(),
    };

    // Try to find a match immediately (within ±100 ELO)
    let match = findMatch(entry, 100);

    if (!match) {
      // Try wider range (±200)
      match = findMatch(entry, 200);
    }

    if (match) {
      // Match found — create a room
      const roomId = uuidv4();
      const room: Room = {
        id: roomId,
        code: generateRoomCode(),
        players: [
          { socketId: match.socketId, name: match.name, rating: match.rating, ready: true },
          { socketId: socket.id, name: playerName, rating, ready: true },
        ],
        gameState: null,
        createdAt: Date.now(),
        timerPreset,
        isPrivate: false,
      };

      rooms.set(roomId, room);
      const matchSocket = io.sockets.sockets.get(match.socketId);
      if (matchSocket) matchSocket.join(roomId);
      socket.join(roomId);

      io.to(roomId).emit('match-found', {
        roomId,
        players: room.players.map(p => ({ name: p.name, rating: p.rating })),
        timerPreset,
      });

      console.log(`Match made: ${playerName} (${rating}) vs ${match.name} (${match.rating})`);
    } else {
      // Add to queue
      matchmakingQueue.push(entry);
      socket.emit('queued', { position: matchmakingQueue.length, rating });
      console.log(`${playerName} queued for matchmaking (queue size: ${matchmakingQueue.length})`);
    }
  });

  // Cancel matchmaking
  socket.on('cancel-matchmaking', () => {
    const idx = matchmakingQueue.findIndex(e => e.socketId === socket.id);
    if (idx !== -1) {
      matchmakingQueue.splice(idx, 1);
      socket.emit('matchmaking-cancelled');
    }
  });

  // Player ready
  socket.on('player-ready', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (player) player.ready = true;

    io.to(roomId).emit('player-ready-update', {
      players: room.players.map(p => ({ name: p.name, ready: p.ready })),
    });

    // Both ready — start game
    if (room.players.length === 2 && room.players.every(p => p.ready)) {
      io.to(roomId).emit('game-start', {
        roomId,
        players: room.players.map(p => ({ name: p.name, rating: p.rating })),
        firstPlayerIndex: Math.random() < 0.5 ? 0 : 1,
      });
      console.log(`Game started in room ${room.code}`);
    }
  });

  // Relay game moves
  socket.on('game-move', ({ roomId, move }: { roomId: string; move: any }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // Broadcast move to opponent
    socket.to(roomId).emit('opponent-move', { move });
  });

  // Relay timer sync
  socket.on('timer-sync', ({ roomId, timers }: { roomId: string; timers: number[] }) => {
    socket.to(roomId).emit('timer-update', { timers });
  });

  // Chat message
  socket.on('chat-message', ({ roomId, message, playerName }: { roomId: string; message: string; playerName: string }) => {
    io.to(roomId).emit('chat-message', { message, playerName, timestamp: Date.now() });
  });

  // Game over
  socket.on('game-over', ({ roomId, winnerIndex, scores }: { roomId: string; winnerIndex: number; scores: number[] }) => {
    const room = rooms.get(roomId);
    if (!room || room.players.length < 2) return;

    // Update ELO ratings
    const winner = room.players[winnerIndex];
    const loser = room.players[1 - winnerIndex];
    const newRatings = calculateNewRatings(winner.rating, loser.rating);

    playerRatings.set(winner.socketId, newRatings.winner);
    playerRatings.set(loser.socketId, newRatings.loser);

    io.to(roomId).emit('game-result', {
      winner: winner.name,
      scores,
      ratingChanges: [
        { name: winner.name, oldRating: winner.rating, newRating: newRatings.winner },
        { name: loser.name, oldRating: loser.rating, newRating: newRatings.loser },
      ],
    });

    // Clean up room after delay
    setTimeout(() => {
      rooms.delete(roomId);
      if (room.code) roomsByCode.delete(room.code);
    }, 60000);
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);

    // Remove from matchmaking queue
    const queueIdx = matchmakingQueue.findIndex(e => e.socketId === socket.id);
    if (queueIdx !== -1) matchmakingQueue.splice(queueIdx, 1);

    // Notify rooms
    for (const [roomId, room] of rooms) {
      const playerIdx = room.players.findIndex(p => p.socketId === socket.id);
      if (playerIdx !== -1) {
        room.players.splice(playerIdx, 1);
        io.to(roomId).emit('player-disconnected', {
          message: 'Your opponent disconnected.',
        });

        if (room.players.length === 0) {
          rooms.delete(roomId);
          if (room.code) roomsByCode.delete(room.code);
        }
      }
    }
  });
});

// Periodic matchmaking expansion (widen search every 15 seconds)
setInterval(() => {
  for (let i = matchmakingQueue.length - 1; i >= 0; i--) {
    const entry = matchmakingQueue[i];
    const waitTime = (Date.now() - entry.joinedAt) / 1000;

    // Expand range based on wait time
    let maxDiff = 100;
    if (waitTime > 15) maxDiff = 200;
    if (waitTime > 30) maxDiff = 400;
    if (waitTime > 60) maxDiff = 800;

    const match = findMatch(entry, maxDiff);
    if (match) {
      matchmakingQueue.splice(i, 1);

      const roomId = uuidv4();
      const room: Room = {
        id: roomId,
        code: generateRoomCode(),
        players: [
          { socketId: match.socketId, name: match.name, rating: match.rating, ready: true },
          { socketId: entry.socketId, name: entry.name, rating: entry.rating, ready: true },
        ],
        gameState: null,
        createdAt: Date.now(),
        timerPreset: entry.timerPreset,
        isPrivate: false,
      };

      rooms.set(roomId, room);
      const matchSocket = io.sockets.sockets.get(match.socketId);
      const entrySocket = io.sockets.sockets.get(entry.socketId);
      if (matchSocket) matchSocket.join(roomId);
      if (entrySocket) entrySocket.join(roomId);

      io.to(roomId).emit('match-found', {
        roomId,
        players: room.players.map(p => ({ name: p.name, rating: p.rating })),
        timerPreset: room.timerPreset,
      });
    }
  }
}, 5000);

httpServer.listen(PORT, () => {
  console.log(`🎲 Scrabble Multiplayer Server running on port ${PORT}`);
  console.log(`   WebSocket connections accepted at ws://localhost:${PORT}`);
});

