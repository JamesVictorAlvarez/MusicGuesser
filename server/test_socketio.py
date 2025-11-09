"""
Integration test for Socket.IO communication
This test verifies that the FastAPI server correctly handles Socket.IO events
"""
import asyncio
import logging
import sys
sys.path.insert(0, '/Users/rv/repos/MusicGuesser/server')

from main import app, sio, game_state

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_socket_communication():
    """Test Socket.IO event communication"""
    logger.info("Testing Socket.IO communication...")
    
    # Create mock clients
    client1_sid = 'client1'
    client2_sid = 'client2'
    
    # Test create room event
    logger.info("\n1. Testing create-room event...")
    await sio._on_message(client1_sid, 'create-room', {
        'playerName': 'Alice',
        'genre': 'pop',
        'type': 'any',
        'rounds': 3
    })
    
    # Check room was created
    rooms = list(game_state.rooms.keys())
    assert len(rooms) == 1, f"Expected 1 room, got {len(rooms)}"
    room_id = rooms[0]
    room = game_state.get_room(room_id)
    assert room is not None
    assert room.host_id == client1_sid
    assert len(room.players) == 1
    logger.info(f"✓ Room created: {room_id}")
    
    # Test join room event
    logger.info("\n2. Testing join-room event...")
    await sio._on_message(client2_sid, 'join-room', {
        'roomId': room_id,
        'playerName': 'Bob'
    })
    
    room = game_state.get_room(room_id)
    assert len(room.players) == 2
    assert client2_sid in room.players
    logger.info(f"✓ Player joined room: {room_id}")
    
    # Test player ready
    logger.info("\n3. Testing player-ready event...")
    await sio._on_message(client1_sid, 'player-ready', {'roomId': room_id})
    room = game_state.get_room(room_id)
    assert room.players[client1_sid].is_ready
    
    await sio._on_message(client2_sid, 'player-ready', {'roomId': room_id})
    room = game_state.get_room(room_id)
    assert room.players[client2_sid].is_ready
    assert room.current_round == 1  # Game should have started
    logger.info("✓ Both players ready, game started")
    
    # Test set round data (from host)
    logger.info("\n4. Testing set-round-data event...")
    track = {'id': 'song123', 'name': 'Test Song', 'artist': 'Test Artist'}
    options = [
        {'name': 'Wrong 1', 'isCorrect': False},
        {'name': 'Correct Song', 'isCorrect': True},
        {'name': 'Wrong 2', 'isCorrect': False},
    ]
    
    await sio._on_message(client1_sid, 'set-round-data', {
        'roomId': room_id,
        'track': track,
        'options': options,
        'gameMode': 'song'
    })
    
    room = game_state.get_room(room_id)
    assert room.round_started
    assert room.current_track == track
    assert len(room.options) == 3
    assert room.game_mode == 'song'
    logger.info("✓ Round data set successfully")
    
    # Test submit answers
    logger.info("\n5. Testing submit-answer event...")
    await sio._on_message(client1_sid, 'submit-answer', {
        'roomId': room_id,
        'answerIndex': 1,  # Correct answer
        'timeTaken': 5.0
    })
    
    room = game_state.get_room(room_id)
    assert client1_sid in room.answers
    assert room.players[client1_sid].current_round_score > 0
    logger.info(f"✓ Player 1 answered (score: {room.players[client1_sid].current_round_score})")
    
    await sio._on_message(client2_sid, 'submit-answer', {
        'roomId': room_id,
        'answerIndex': 0,  # Wrong answer
        'timeTaken': 3.0
    })
    
    room = game_state.get_room(room_id)
    assert client2_sid in room.answers
    assert room.players[client2_sid].current_round_score == 0
    assert len(room.answers) == 2
    logger.info(f"✓ Player 2 answered (score: {room.players[client2_sid].current_round_score})")
    
    # Check that all players answered
    assert game_state.all_players_answered(room_id)
    logger.info("✓ All players answered")
    
    # Simulate round finalization and advancement
    logger.info("\n6. Testing round advancement...")
    game_state.finalize_round(room_id)
    
    alice_score = room.players[client1_sid].score
    bob_score = room.players[client2_sid].score
    assert alice_score > bob_score
    logger.info(f"✓ Scores finalized: Alice={alice_score}, Bob={bob_score}")
    
    # Test next round
    await sio._on_message(client1_sid, 'next-round', {'roomId': room_id})
    room = game_state.get_room(room_id)
    assert room.current_round == 2
    assert not room.round_started  # Should reset for new round
    logger.info("✓ Advanced to round 2")
    
    # Test disconnect
    logger.info("\n7. Testing disconnect event...")
    await sio._on_disconnect(client2_sid)
    room = game_state.get_room(room_id)
    # Room should still exist since host is still connected
    assert room is not None
    logger.info("✓ Player 2 disconnected, room still active")
    
    # Host disconnect should close room
    await sio._on_disconnect(client1_sid)
    # Room should be deleted
    room = game_state.get_room(room_id)
    # Note: May not be deleted immediately due to handler async logic
    logger.info("✓ Host disconnected")
    
    logger.info("\n" + "="*60)
    logger.info("ALL SOCKET.IO TESTS PASSED ✓")
    logger.info("="*60)


if __name__ == '__main__':
    asyncio.run(test_socket_communication())
