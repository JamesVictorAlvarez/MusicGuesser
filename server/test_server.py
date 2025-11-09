"""
Simple test to verify the server functionality
"""
import asyncio
import logging
from state_manager import GameStateManager
from models import GameRoom, Player, Answer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_game_flow():
    """Test basic game flow"""
    state = GameStateManager()
    
    # Test 1: Create room
    logger.info("TEST 1: Creating room...")
    room_id = state.create_room('player1_id', 'Alice', 'pop', 'any', 5)
    assert room_id is not None
    assert state.room_exists(room_id)
    room = state.get_room(room_id)
    assert len(room.players) == 1
    assert 'player1_id' in room.players
    logger.info(f"✓ Room created: {room_id}")
    
    # Test 2: Join room
    logger.info("TEST 2: Player joining room...")
    joined = state.join_room(room_id, 'player2_id', 'Bob')
    assert joined
    room = state.get_room(room_id)
    assert len(room.players) == 2
    logger.info("✓ Player joined successfully")
    
    # Test 3: Player ready
    logger.info("TEST 3: Players marking ready...")
    ready1 = state.set_player_ready(room_id, 'player1_id')
    assert not ready1  # Not all ready yet
    ready2 = state.set_player_ready(room_id, 'player2_id')
    assert ready2  # All ready now
    logger.info("✓ All players ready")
    
    # Test 4: Start game
    logger.info("TEST 4: Starting game...")
    state.start_game(room_id)
    room = state.get_room(room_id)
    assert room.current_round == 1
    logger.info("✓ Game started")
    
    # Test 5: Set round data
    logger.info("TEST 5: Setting round data...")
    track = {'id': '123', 'name': 'Test Song', 'artist': 'Test Artist'}
    options = [
        {'name': 'Wrong 1', 'isCorrect': False},
        {'name': 'Correct Song', 'isCorrect': True},
        {'name': 'Wrong 2', 'isCorrect': False},
    ]
    result = state.set_round_data(room_id, track, options, 'song')
    assert result
    room = state.get_room(room_id)
    assert room.round_started
    assert room.game_mode == 'song'
    logger.info("✓ Round data set")
    
    # Test 6: Submit answers
    logger.info("TEST 6: Players submitting answers...")
    state.submit_answer(room_id, 'player1_id', 1, 5.0)  # Correct
    state.submit_answer(room_id, 'player2_id', 0, 2.0)  # Wrong
    room = state.get_room(room_id)
    assert len(room.answers) == 2
    assert room.players['player1_id'].current_round_score > 0
    assert room.players['player2_id'].current_round_score == 0
    logger.info("✓ Answers submitted")
    
    # Test 7: Check all answered
    logger.info("TEST 7: Checking if all players answered...")
    all_answered = state.all_players_answered(room_id)
    assert all_answered
    logger.info("✓ All players answered")
    
    # Test 8: Finalize round
    logger.info("TEST 8: Finalizing round...")
    state.finalize_round(room_id)
    room = state.get_room(room_id)
    assert room.players['player1_id'].score > 0
    logger.info(f"✓ Round finalized. Scores: Alice={room.players['player1_id'].score}, "
               f"Bob={room.players['player2_id'].score}")
    
    # Test 9: Advance rounds
    logger.info("TEST 9: Advancing through rounds...")
    for i in range(1, 5):
        continues = state.advance_round(room_id)
        room = state.get_room(room_id)
        assert continues
        assert room.current_round == i + 1
        logger.info(f"  Round {i+1}/5")
    
    # Test 10: Game over
    logger.info("TEST 10: Game over...")
    continues = state.advance_round(room_id)
    assert not continues
    room = state.get_room(room_id)
    assert room.game_finished
    logger.info(f"✓ Game finished. Final scores: Alice={room.players['player1_id'].score}, "
               f"Bob={room.players['player2_id'].score}")
    
    # Test 11: Remove players
    logger.info("TEST 11: Removing players...")
    delete_room = state.remove_player(room_id, 'player1_id')
    assert delete_room  # Host left, room should be deleted
    state.delete_room(room_id)
    assert not state.room_exists(room_id)
    logger.info("✓ Room cleaned up")
    
    logger.info("\n" + "="*50)
    logger.info("ALL TESTS PASSED ✓")
    logger.info("="*50)


async def test_concurrent_rooms():
    """Test multiple concurrent rooms"""
    logger.info("\nTesting concurrent rooms...")
    state = GameStateManager()
    
    # Create 3 rooms
    room_ids = []
    for i in range(3):
        room_id = state.create_room(f'host{i}', f'Host{i}')
        room_ids.append(room_id)
        for j in range(2):
            state.join_room(room_id, f'player{i}_{j}', f'Player{i}_{j}')
    
    assert len(room_ids) == 3
    assert all(state.room_exists(rid) for rid in room_ids)
    
    logger.info(f"✓ Created 3 concurrent rooms with 3 players each")
    
    # Verify isolation
    room0 = state.get_room(room_ids[0])
    room1 = state.get_room(room_ids[1])
    room2 = state.get_room(room_ids[2])
    
    assert len(room0.players) == 3
    assert len(room1.players) == 3
    assert len(room2.players) == 3
    
    # Rooms should be independent
    assert 'host0' in room0.players
    assert 'host0' not in room1.players
    assert 'host0' not in room2.players
    
    logger.info("✓ Rooms are properly isolated")
    logger.info("="*50)


if __name__ == '__main__':
    asyncio.run(test_game_flow())
    asyncio.run(test_concurrent_rooms())
