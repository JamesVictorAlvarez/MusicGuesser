"""
FastAPI server for Music Guesser multiplayer game
Replaces the Node.js Express + Socket.IO server
"""
import logging
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from socketio import AsyncServer, ASGIApp
import config
from state_manager import GameStateManager
from event_handlers import EventHandlers

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Music Guesser Server")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Socket.IO server
sio = AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=config.CORS_ORIGINS,
    ping_timeout=60,
    ping_interval=25,
)

# Initialize game state manager
game_state = GameStateManager()

# Initialize event handlers with shared state
event_handlers = EventHandlers(sio, game_state)

# Register Socket.IO event handlers
@sio.on('connect')
async def on_connect(sid, environ):
    """Handle client connection"""
    logger.info(f'Player connected: {sid}')


@sio.on('create-room')
async def on_create_room(sid, data):
    """Handle room creation"""
    await event_handlers.handle_create_room(sid, data)


@sio.on('join-room')
async def on_join_room(sid, data):
    """Handle player joining room"""
    await event_handlers.handle_join_room(sid, data)


@sio.on('leave-room')
async def on_leave_room(sid, data):
    """Handle player leaving room"""
    await event_handlers.handle_leave_room(sid, data)


@sio.on('player-ready')
async def on_player_ready(sid, data):
    """Handle player ready"""
    await event_handlers.handle_player_ready(sid, data)


@sio.on('submit-answer')
async def on_submit_answer(sid, data):
    """Handle answer submission"""
    await event_handlers.handle_submit_answer(sid, data)


@sio.on('next-round')
async def on_next_round(sid, data):
    """Handle next round"""
    await event_handlers.handle_next_round(sid, data)


@sio.on('set-round-data')
async def on_set_round_data(sid, data):
    """Handle setting round data"""
    await event_handlers.handle_set_round_data(sid, data)


@sio.on('disconnect')
async def on_disconnect(sid):
    """Handle client disconnection"""
    await event_handlers.handle_disconnect(sid)


# Wrap Socket.IO with ASGI
asgi_app = ASGIApp(sio, app)


if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"Starting Music Guesser server on {config.HOST}:{config.PORT}")
    uvicorn.run(
        app="main:asgi_app",
        host=config.HOST,
        port=config.PORT,
        reload=config.DEBUG,
        log_level='info' if config.DEBUG else 'warning',
    )
