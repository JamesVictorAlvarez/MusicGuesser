# Development Guide for Music Guesser

This guide covers development setup and workflow for the Music Guesser project with the new FastAPI server.

## Project Structure

```
MusicGuesser/
├── server/                  # Python FastAPI server
│   ├── main.py             # FastAPI app & Socket.IO setup
│   ├── config.py           # Configuration
│   ├── models.py           # Data classes
│   ├── state_manager.py    # Game logic
│   ├── event_handlers.py   # Event processing
│   ├── test_server.py      # Unit tests
│   ├── test_socketio.py    # Integration tests
│   ├── requirements.txt    # Dependencies
│   ├── .env                # Configuration
│   └── README.md           # Server documentation
├── src/                     # React frontend
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API services
│   ├── utils/              # Utilities (socket.js, gameLogic.js)
│   ├── App.jsx            # Main app component
│   └── main.jsx           # Entry point
├── server_venv/            # Python virtual environment
├── run_server.sh           # Server startup script
├── vite.config.js          # Vite configuration
├── package.json            # Frontend dependencies
├── .env.example            # Environment template
└── MIGRATION_GUIDE.md      # Migration documentation
```

## Development Workflow

### 1. Initial Setup

```bash
# Clone and setup
git clone <repo>
cd MusicGuesser

# Setup Python server
python3 -m venv server_venv
source server_venv/bin/activate
pip install -r server/requirements.txt

# Setup frontend
npm install
```

### 2. Running Development Servers

**Terminal 1: Python Backend**
```bash
source server_venv/bin/activate
python3 server/main.py
# Or: ./run_server.sh
```

Server runs on `http://localhost:3001`

**Terminal 2: React Frontend**
```bash
npm run dev
```

Frontend runs on `http://localhost:5173` (Vite default)

### 3. Environment Configuration

Create `.env` at project root:
```env
VITE_SERVER_URL=http://localhost:3001
```

Create `server/.env`:
```env
PORT=3001
HOST=0.0.0.0
DEBUG=True
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Making Changes

### Backend Changes (Python Server)

**Location**: `server/` directory

**Code Organization**:
- **Game Logic**: Edit `state_manager.py` for game rules, scoring, room management
- **Event Handling**: Edit `event_handlers.py` for Socket.IO event processing
- **Data Models**: Edit `models.py` for data structures
- **Configuration**: Edit `config.py` or `server/.env` for settings

**After Making Changes**:
1. The server auto-reloads in debug mode
2. Run tests to verify: `python3 server/test_server.py`
3. Check Socket.IO protocol compliance

### Frontend Changes (React)

**Location**: `src/` directory

**Key Files**:
- `src/utils/socket.js`: Socket.IO connection (don't modify protocol)
- `src/hooks/useMultiplayer.js`: Multiplayer game logic
- `src/components/multiplayer/`: UI components for multiplayer
- `src/hooks/useSocket.js`: Socket event handling

**After Making Changes**:
1. Frontend hot-reloads automatically
2. Test Socket.IO communication works
3. Verify with both single and multiplayer modes

### Testing Changes

**Run Unit Tests**:
```bash
source server_venv/bin/activate
python3 server/test_server.py
```

**Run Integration Tests**:
```bash
python3 server/test_socketio.py
```

**Manual Testing**:
1. Start backend: `./run_server.sh`
2. Start frontend: `npm run dev`
3. Test multiplayer features:
   - Create a room
   - Join as second player
   - Play through rounds
   - Verify scores update correctly

## Common Development Tasks

### Adding a New Socket.IO Event

**1. Backend (event_handlers.py)**:
```python
@sio.on('my-event')
async def on_my_event(sid, data):
    """Handle my-event"""
    await event_handlers.handle_my_event(sid, data)
```

**2. Event Handler (event_handlers.py)**:
```python
async def handle_my_event(self, player_id: str, data: dict):
    """Process my-event"""
    # Implementation here
    pass
```

**3. Frontend (useSocket.js or component)**:
```javascript
socket.on('my-event', (data) => {
  // Handle event
  console.log('Received:', data)
})

// Emit event:
socket.emit('my-event', { /* data */ })
```

### Adding a New Game Rule

Edit `state_manager.py`:
```python
def apply_new_rule(self, room_id: str) -> bool:
    """Apply a new game rule"""
    room = self.get_room(room_id)
    if not room:
        return False
    # Implement rule logic
    return True
```

### Debugging Socket Communication

Add logging in `event_handlers.py`:
```python
import logging
logger = logging.getLogger(__name__)

async def handle_my_event(self, player_id: str, data: dict):
    logger.info(f"Event received: player={player_id}, data={data}")
    # ... rest of code
```

Monitor logs:
```bash
# Terminal running server will show logs
# Look for: INFO:event_handlers:Event received...
```

Browser console:
```javascript
// In browser console
socket.on('*', (event, ...args) => {
  console.log('Socket event:', event, args)
})
```

## Build and Deployment

### Build for Production

**Frontend**:
```bash
npm run build
# Creates dist/ folder
```

**Backend**:
No build needed, Python is interpreted. But do run tests:
```bash
python3 server/test_server.py
```

### Docker Deployment

**Build Image**:
```bash
docker build -t music-guesser .
docker run -p 3001:3001 -p 5173:5173 music-guesser
```

**Docker Compose** (for local development):
```yaml
version: '3'
services:
  backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      PORT: 3001
      DEBUG: "True"
  
  frontend:
    image: node:18
    ports:
      - "5173:5173"
    volumes:
      - ./src:/app/src
    working_dir: /app
    command: sh -c "npm install && npm run dev"
```

Run with: `docker-compose up`

## Performance Optimization

### Backend (Python)

1. **Async Code**: Use `await` properly to avoid blocking
2. **State Management**: Keep in-memory state lean
3. **Connection Limits**: Monitor concurrent connections
4. **Logging**: Use appropriate log levels

### Frontend (React)

1. **Memoization**: Use `useMemo` for expensive calculations
2. **Component Splitting**: Break large components
3. **Event Debouncing**: Debounce frequent Socket.IO events
4. **Asset Loading**: Lazy load components

## Troubleshooting Development

### Socket Connection Fails
```bash
# 1. Check server is running
curl http://localhost:3001

# 2. Check logs in server terminal for errors
# 3. Verify VITE_SERVER_URL is correct
# 4. Check CORS_ORIGINS in server/.env
```

### Virtual Environment Issues
```bash
# Recreate venv
rm -rf server_venv
python3 -m venv server_venv
source server_venv/bin/activate
pip install -r server/requirements.txt
```

### Frontend Build Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Hot Reload Not Working
```bash
# Server: Should auto-reload in debug mode
# If not, restart: Ctrl+C then ./run_server.sh

# Frontend: Should auto-reload
# If not: Hard refresh browser (Cmd+Shift+R)
```

## Code Style and Standards

### Python
- Use type hints: `def func(x: str) -> bool:`
- Follow PEP 8
- Use async/await for I/O operations
- Document with docstrings

### JavaScript/React
- Use ES6+ syntax
- Component naming: PascalCase
- Function naming: camelCase
- Use hooks for state management

## Testing Checklist Before Commit

- [ ] Backend tests pass: `python3 server/test_server.py`
- [ ] No console errors in browser
- [ ] Socket connection works
- [ ] Single-player mode works
- [ ] Multiplayer mode works
- [ ] Game flow complete (create → join → play → end)
- [ ] Scores calculate correctly
- [ ] No CORS errors
- [ ] No memory leaks (check browser DevTools)

## Getting Help

1. **Socket.IO Issues**: Check `server/event_handlers.py` for event processing
2. **Game Logic Issues**: Check `server/state_manager.py` for rules
3. **Frontend Issues**: Check `src/hooks/useMultiplayer.js` for state management
4. **Deployment Issues**: See `MIGRATION_GUIDE.md`

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Python-SocketIO](https://python-socketio.readthedocs.io/)
- [React Documentation](https://react.dev/)
- [Socket.IO Protocol](https://socket.io/docs/v4/socket-io-protocol/)

## Contributing

When making changes:
1. Create a feature branch
2. Make changes and test thoroughly
3. Run all tests
4. Commit with clear messages
5. Create pull request with description

Example commit:
```
feat: add new game mode

- Added new game mode selection to UI
- Implemented scoring rules for new mode
- Updated Socket.IO protocol handler
- Added tests for new scoring logic
```
