"""
Game state manager for handling room and player state
"""
import random
import string
from typing import Dict, Optional
from models import GameRoom, Player
import logging

logger = logging.getLogger(__name__)


class GameStateManager:
    """Manages all active game rooms and their state"""
    
    def __init__(self):
        self.rooms: Dict[str, GameRoom] = {}
    
    def generate_room_id(self) -> str:
        """Generate a random room ID"""
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=7))
    
    def create_room(self, host_id: str, player_name: str, genre: str = 'any', 
                   type_: str = 'any', rounds: int = 10) -> str:
        """Create a new game room and return the room ID"""
        room_id = self.generate_room_id()
        
        room = GameRoom(
            id=room_id,
            host_id=host_id,
            players={host_id: Player(id=host_id, name=player_name)},
            total_rounds=rounds,
            genre=genre,
            type=type_,
        )
        
        self.rooms[room_id] = room
        logger.info(f"Created room {room_id} for player {player_name} ({host_id}) "
                   f"with genre: {genre}, type: {type_}, rounds: {rounds}")
        return room_id
    
    def join_room(self, room_id: str, player_id: str, player_name: str) -> bool:
        """Add a player to an existing room. Returns True if successful."""
        room = self.rooms.get(room_id)
        
        if not room:
            logger.warning(f"Room {room_id} not found")
            return False
        
        if room.game_finished:
            logger.warning(f"Cannot join finished game in room {room_id}")
            return False
        
        if player_id in room.players:
            logger.warning(f"Player {player_id} already in room {room_id}")
            return False
        
        room.players[player_id] = Player(id=player_id, name=player_name)
        logger.info(f"Player {player_name} ({player_id}) joined room {room_id}. "
                   f"Total players: {len(room.players)}")
        return True
    
    def remove_player(self, room_id: str, player_id: str) -> bool:
        """Remove a player from a room. Returns True if room should be deleted."""
        room = self.rooms.get(room_id)
        
        if not room:
            logger.warning(f"Room {room_id} not found for player removal")
            return False
        
        if player_id not in room.players:
            logger.warning(f"Player {player_id} not in room {room_id}")
            return False
        
        player_name = room.players[player_id].name
        is_host = room.host_id == player_id
        del room.players[player_id]
        
        logger.info(f"Player {player_name} ({player_id}) removed from room {room_id}")
        
        # If host left or no players remain, room should be deleted
        if is_host or len(room.players) == 0:
            logger.info(f"Room {room_id} eligible for deletion "
                        f"(host_left={is_host}, empty={len(room.players) == 0})")
            return True
        
        return False
    
    def delete_room(self, room_id: str) -> bool:
        """Delete a room. Returns True if room was deleted."""
        if room_id in self.rooms:
            del self.rooms[room_id]
            logger.info(f"Room {room_id} deleted")
            return True
        return False
    
    def get_room(self, room_id: str) -> Optional[GameRoom]:
        """Get a room by ID"""
        return self.rooms.get(room_id)
    
    def room_exists(self, room_id: str) -> bool:
        """Check if a room exists"""
        return room_id in self.rooms
    
    def get_player(self, room_id: str, player_id: str) -> Optional[Player]:
        """Get a player from a room"""
        room = self.rooms.get(room_id)
        if room:
            return room.players.get(player_id)
        return None
    
    def set_player_ready(self, room_id: str, player_id: str) -> bool:
        """Mark a player as ready. Returns True if all players are ready."""
        room = self.rooms.get(room_id)
        if not room:
            return False
        
        player = room.players.get(player_id)
        if player:
            player.is_ready = True
            logger.info(f"Player {player.name} marked as ready in room {room_id}")
            
            # Check if all players are ready
            all_ready = all(p.is_ready for p in room.players.values())
            if all_ready:
                logger.info(f"All players ready in room {room_id}")
            return all_ready
        
        return False
    
    def reset_round_state(self, room_id: str) -> bool:
        """Reset room state for a new round"""
        room = self.rooms.get(room_id)
        if not room:
            return False
        
        room.round_started = False
        room.answers.clear()
        room.current_track = None
        room.options = []
        
        # Cancel any pending timeout task
        if room.round_timeout_task:
            room.round_timeout_task.cancel()
            room.round_timeout_task = None
        
        logger.info(f"Reset round state for room {room_id}")
        return True
    
    def submit_answer(self, room_id: str, player_id: str, answer_index: int, 
                     time_taken: float) -> bool:
        """Submit an answer for a player"""
        room = self.rooms.get(room_id)
        if not room or not room.round_started:
            return False
        
        player = room.players.get(player_id)
        if not player:
            logger.warning(f"Player {player_id} not found in room {room_id}")
            return False
        
        # Check if answer is correct
        if 0 <= answer_index < len(room.options):
            is_correct = room.options[answer_index].get('isCorrect', False)
        else:
            is_correct = False
        
        # Calculate points if correct
        if is_correct:
            # Points in hundreds, with seconds counting
            # Max 1000 points at 0 seconds, 0 points at 10 seconds
            points = max(0, int((10 - time_taken) * 100))
            player.current_round_score = points
        else:
            player.current_round_score = 0
        
        # Store answer
        from models import Answer
        room.answers[player_id] = Answer(
            answer_index=answer_index,
            time_taken=time_taken,
            is_correct=is_correct,
            player_name=player.name,
        )
        
        logger.info(f"Player {player.name} answered in room {room_id}. "
                   f"Answers submitted: {len(room.answers)}/{len(room.players)}")
        
        return True
    
    def all_players_answered(self, room_id: str) -> bool:
        """Check if all players have answered the current round"""
        room = self.rooms.get(room_id)
        if not room:
            return False
        
        if len(room.players) == 0:
            return False
        
        return len(room.answers) == len(room.players)
    
    def finalize_round(self, room_id: str) -> bool:
        """Apply round scores to player total scores"""
        room = self.rooms.get(room_id)
        if not room:
            return False
        
        for player in room.players.values():
            player.score += player.current_round_score
        
        logger.info(f"Finalized round scores for room {room_id}")
        return True
    
    def advance_round(self, room_id: str) -> bool:
        """Advance to the next round"""
        room = self.rooms.get(room_id)
        if not room:
            return False
        
        room.current_round += 1
        logger.info(f"Advanced to round {room.current_round} in room {room_id}")
        
        if room.current_round > room.total_rounds:
            room.game_finished = True
            logger.info(f"Game finished in room {room_id}")
            return False  # Game over
        
        return True  # Game continues
    
    def set_round_data(self, room_id: str, track: dict, options: list, 
                      game_mode: str) -> bool:
        """Set the track and options for the current round"""
        room = self.rooms.get(room_id)
        if not room:
            return False
        
        if room.round_started:
            logger.warning(f"Round already started in room {room_id}, "
                          "ignoring duplicate set-round-data")
            return False
        
        room.current_track = track
        room.options = options
        room.game_mode = game_mode
        room.round_started = True
        room.answers.clear()  # Clear previous answers
        
        logger.info(f"Set round data for room {room_id}. Track: {track.get('name')}, "
                   f"Options: {len(options)}, GameMode: {game_mode}")
        return True
    
    def start_game(self, room_id: str) -> bool:
        """Mark game as started"""
        room = self.rooms.get(room_id)
        if not room:
            return False
        
        room.current_round = 1
        # Reset ready status for new game
        for player in room.players.values():
            player.is_ready = False
        
        logger.info(f"Game started in room {room_id} with {len(room.players)} players")
        return True
