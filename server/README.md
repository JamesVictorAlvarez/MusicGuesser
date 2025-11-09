# Music Guesser FastAPI Server

A Python-based server for the Music Guesser multiplayer game, using FastAPI and Socket.IO for real-time communication.

## Setup

### Prerequisites
- Python 3.8+
- Virtual environment (recommended)

### Installation

1. Create and activate a virtual environment:
```bash
python3 -m venv ../server_venv
source ../server_venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

### Running the Server

From the project root:
```bash
./run_server.sh
```

Or manually:
```bash
source server_venv/bin/activate
python3 server/main.py
```

The server will start on `http://localhost:3001` (or the port specified in `.env`)

### Configuration

Edit `server/.env` to customize:
- `PORT`: Server port (default: 3001)
- `HOST`: Server host (default: 0.0.0.0)
- `DEBUG`: Enable debug mode (default: True)
- `CORS_ORIGINS`: Allowed CORS origins

## Architecture

### File Structure

- **main.py**: FastAPI app initialization and Socket.IO setup
- **config.py**: Configuration and environment settings
- **models.py**: Data classes for game state (Player, GameRoom, Answer)
- **state_manager.py**: Core game logic and state management
- **event_handlers.py**: Socket.IO event handlers for multiplayer communication
- **test_server.py**: Unit tests for game logic
- **requirements.txt**: Python dependencies

### Key Components

#### GameStateManager
Handles all game state operations:
- Room creation/deletion
- Player management
- Round progression
- Score calculation
- Answer validation

#### EventHandlers
Processes Socket.IO events:
- `create-room`: Create a new game room
- `join-room`: Join an existing room
- `leave-room`: Leave a room
- `player-ready`: Mark player as ready
- `submit-answer`: Submit an answer
- `set-round-data`: Set track and options for a round
- `next-round`: Advance to next round
- `disconnect`: Handle player disconnection

#### Game State Models
- **GameRoom**: Represents a multiplayer game session
- **Player**: Individual player in a room
- **Answer**: Player's answer to a round question

## Protocol

The server communicates with clients via Socket.IO events. Events use the same protocol as the original Node.js server, ensuring full compatibility with existing clients.

### Client to Server Events
```
create-room: { playerName, genre, type, rounds }
join-room: { roomId, playerName }
leave-room: { roomId }
player-ready: { roomId }
submit-answer: { roomId, answerIndex, timeTaken }
set-round-data: { roomId, track, options, gameMode }
next-round: { roomId }
```

### Server to Client Events
```
room-created: { roomId }
room-joined: { roomId }
room-error: { message }
room-updated: { full room state object }
game-started: {}
load-round: { round, isHost }
round-started: { track, options, gameMode }
all-answers-submitted: {}
game-over: { players }
room-closed: { message }
```

## Testing

Run the test suite:
```bash
source server_venv/bin/activate
python3 server/test_server.py
```

Tests verify:
- Room creation and joining
- Player ready state
- Game flow (start → load round → submit answers → finalize)
- Score calculation
- Round progression
- Concurrent room isolation
- Player removal and cleanup

## Performance

- Handles multiple concurrent multiplayer rooms
- Async event processing with asyncio
- Timeout handling for unanswered rounds (15 seconds)
- Room cleanup on host disconnect
- Player isolation between rooms

## Migration from Node.js

This is a drop-in replacement for `server.js`. Key changes:
- FastAPI instead of Express.js
- python-socketio instead of socket.io (JavaScript)
- Python dataclasses instead of JavaScript objects
- asyncio instead of setTimeout for timeouts

No client-side changes required—the Socket.IO protocol is identical.
