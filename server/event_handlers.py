"""
Socket.IO event handlers for the Music Guesser server
"""
import logging
import asyncio
from typing import Dict, Optional
from socketio import AsyncServer
from state_manager import GameStateManager
from models import Answer

logger = logging.getLogger(__name__)


class EventHandlers:
    """Handles all Socket.IO events for the game"""
    
    def __init__(self, sio: AsyncServer, game_state: GameStateManager):
        self.sio = sio
        self.game_state = game_state
        # Map socket IDs to room IDs for quick lookup on disconnect
        self.player_rooms: Dict[str, str] = {}
    
    async def _remove_from_any_room(self, player_id: str) -> Optional[str]:
        """
        Remove a player from any existing room they might be in.
        Returns the room ID if player was in a room.
        """
        # Find which room this player is in
        for room_id in list(self.player_rooms.keys()):
            if self.player_rooms.get(room_id) == player_id:
                del self.player_rooms[room_id]
                
                # Check if room should be deleted
                if self.game_state.remove_player(room_id, player_id):
                    # Host left or room is empty - delete room
                    room = self.game_state.get_room(room_id)
                    if room:
                        # Notify remaining players
                        for other_player_id in room.players.keys():
                            await self.sio.emit(
                                'room-closed',
                                {'message': 'Host left the room'},
                                to=other_player_id
                            )
                    self.game_state.delete_room(room_id)
                else:
                    # Regular player left - notify others
                    room = self.game_state.get_room(room_id)
                    if room:
                        for other_player_id in room.players.keys():
                            await self.sio.emit(
                                'room-updated',
                                room.to_dict(),
                                to=other_player_id
                            )
                
                return room_id
        
        return None
    
    async def _broadcast_to_room(self, room_id: str, event: str, data: dict):
        """Broadcast an event to all players in a room"""
        room = self.game_state.get_room(room_id)
        if room:
            for player_id in room.players.keys():
                await self.sio.emit(event, data, to=player_id)
    
    async def handle_create_room(self, player_id: str, data: dict):
        """Handle room creation event"""
        logger.info(f'=== CREATE-ROOM REQUEST ===')
        logger.info(f'Player {player_id} attempting to create room')
        
        # Remove from any existing room
        await self._remove_from_any_room(player_id)
        
        # Extract data
        player_name = data.get('playerName', 'Player')
        genre = data.get('genre', 'any')
        type_ = data.get('type', 'any')
        rounds = data.get('rounds', 10)
        
        # Create room
        room_id = self.game_state.create_room(player_id, player_name, genre, type_, rounds)
        
        # Track player in this room
        self.player_rooms[room_id] = player_id
        
        # Add player to Socket.IO room
        await self.sio.enter_room(player_id, room_id)
        
        # Send confirmation to creator
        await self.sio.emit('room-created', {'roomId': room_id}, to=player_id)
        
        # Send initial room state
        room = self.game_state.get_room(room_id)
        if room:
            await self._broadcast_to_room(room_id, 'room-updated', room.to_dict())
            logger.info(f'Room {room_id} created with state: {room.to_dict()}')
    
    async def handle_join_room(self, player_id: str, data: dict):
        """Handle player joining room"""
        room_id = data.get('roomId')
        player_name = data.get('playerName', 'Player')
        
        logger.info(f'Player {player_name} ({player_id}) attempting to join room {room_id}')
        
        # Remove from any existing room
        await self._remove_from_any_room(player_id)
        
        # Try to join
        if not self.game_state.room_exists(room_id):
            logger.warning(f'Room {room_id} not found')
            await self.sio.emit(
                'room-error',
                {'message': 'Room not found'},
                to=player_id
            )
            return
        
        if not self.game_state.join_room(room_id, player_id, player_name):
            logger.warning(f'Could not join room {room_id}')
            await self.sio.emit(
                'room-error',
                {'message': 'Cannot join this room'},
                to=player_id
            )
            return
        
        # Track player in this room
        self.player_rooms[room_id] = player_id
        
        # Add to Socket.IO room
        await self.sio.enter_room(player_id, room_id)
        
        # Send confirmation
        await self.sio.emit('room-joined', {'roomId': room_id}, to=player_id)
        
        # Broadcast updated room state
        room = self.game_state.get_room(room_id)
        if room:
            await self._broadcast_to_room(room_id, 'room-updated', room.to_dict())
            player_names = [p.name for p in room.players.values()]
            logger.info(f'Player {player_name} joined room {room_id}. '
                       f'Players: {player_names}')
    
    async def handle_leave_room(self, player_id: str, data: dict):
        """Handle player leaving room"""
        room_id = data.get('roomId')
        logger.info(f'Player {player_id} leaving room {room_id}')
        
        room = self.game_state.get_room(room_id)
        if not room:
            logger.warning(f'Room {room_id} not found')
            return
        
        # Remove player from Socket.IO room
        await self.sio.leave_room(player_id, room_id)
        
        # Check if should delete room
        if self.game_state.remove_player(room_id, player_id):
            # Host left or room is empty
            room = self.game_state.get_room(room_id)
            if room:
                for other_player_id in room.players.keys():
                    await self.sio.emit(
                        'room-closed',
                        {'message': 'Host left the room'},
                        to=other_player_id
                    )
            self.game_state.delete_room(room_id)
            if room_id in self.player_rooms:
                del self.player_rooms[room_id]
        else:
            # Regular player left - notify others
            room = self.game_state.get_room(room_id)
            if room:
                await self._broadcast_to_room(room_id, 'room-updated', room.to_dict())
            if room_id in self.player_rooms:
                del self.player_rooms[room_id]
    
    async def handle_player_ready(self, player_id: str, data: dict):
        """Handle player ready"""
        room_id = data.get('roomId')
        logger.info(f'Player {player_id} ready in room {room_id}')
        
        room = self.game_state.get_room(room_id)
        if not room:
            logger.warning(f'Room {room_id} not found')
            return
        
        # Mark player as ready
        all_ready = self.game_state.set_player_ready(room_id, player_id)
        
        # Broadcast updated room state
        await self._broadcast_to_room(room_id, 'room-updated', room.to_dict())
        
        # If all ready and game hasn't started, start game
        if all_ready and room.current_round == 0:
            logger.info(f'All players ready in room {room_id}, starting game')
            await self._start_game(room_id)
    
    async def _start_game(self, room_id: str):
        """Start the game"""
        self.game_state.start_game(room_id)
        room = self.game_state.get_room(room_id)
        
        if room:
            # Notify all players that game started
            await self._broadcast_to_room(room_id, 'game-started', {})
            # Load first round
            await self._load_round(room_id)
    
    async def _load_round(self, room_id: str):
        """Load a new round"""
        room = self.game_state.get_room(room_id)
        if not room:
            logger.info(f'loadRound: Room {room_id} not found')
            return
        
        # Check if there are still players
        if len(room.players) == 0:
            logger.info(f'loadRound: No players in room {room_id}, deleting room')
            self.game_state.delete_room(room_id)
            return
        
        # Check if host is still in the room
        if room.host_id not in room.players:
            logger.info(f'loadRound: Host left room {room_id}, closing room')
            for other_player_id in room.players.keys():
                await self.sio.emit(
                    'room-closed',
                    {'message': 'Host left the room'},
                    to=other_player_id
                )
            self.game_state.delete_room(room_id)
            return
        
        logger.info(f'loadRound: Loading round {room.current_round} for room {room_id} '
                   f'with {len(room.players)} players')
        
        # Reset round state
        self.game_state.reset_round_state(room_id)
        
        # Tell host to load track and send round data
        if room.host_id in room.players:
            await self.sio.emit(
                'load-round',
                {'round': room.current_round, 'isHost': True},
                to=room.host_id
            )
        
        # Tell other players to wait
        for player_id in room.players.keys():
            if player_id != room.host_id:
                await self.sio.emit(
                    'load-round',
                    {'round': room.current_round, 'isHost': False},
                    to=player_id
                )
    
    async def handle_set_round_data(self, player_id: str, data: dict):
        """Handle setting round data (from host)"""
        room_id = data.get('roomId')
        track = data.get('track')
        options = data.get('options')
        game_mode = data.get('gameMode')
        
        logger.info(f'=== SET-ROUND-DATA RECEIVED ===')
        logger.info(f'set-round-data received from {player_id} for room {room_id}')
        
        room = self.game_state.get_room(room_id)
        if not room:
            logger.warning(f'Room {room_id} not found - sending error to client')
            await self.sio.emit(
                'room-error',
                {'message': 'Room not found'},
                to=player_id
            )
            return
        
        # Verify player is in this room
        if player_id not in room.players:
            logger.warning(f'Player {player_id} not in room {room_id}')
            await self.sio.emit(
                'room-error',
                {'message': 'You are not in this room'},
                to=player_id
            )
            return
        
        if not track or not options or not game_mode:
            logger.error(f'Invalid round data from {player_id}: '
                        f'missing track, options, or gameMode')
            return
        
        # Set round data
        self.game_state.set_round_data(room_id, track, options, game_mode)
        
        logger.info(f'Setting round data for room {room_id}: '
                   f'Track={track.get("name")}, Options={len(options)}, '
                   f'GameMode={game_mode}')
        
        # Broadcast round-started to all players
        logger.info(f'Broadcasting round-started to {len(room.players)} players '
                   f'in room {room_id}')
        
        await self._broadcast_to_room(room_id, 'round-started', {
            'track': track,
            'options': options,
            'gameMode': game_mode,
        })
        
        logger.info(f'=== ROUND-STARTED BROADCAST COMPLETE ===')
        
        # Set timeout for unanswered questions (15 seconds total)
        room.round_timeout_task = asyncio.create_task(
            self._round_timeout(room_id)
        )
    
    async def _round_timeout(self, room_id: str):
        """Handle round timeout after 15 seconds"""
        try:
            await asyncio.sleep(15)
            
            room = self.game_state.get_room(room_id)
            if not room or not room.round_started:
                return
            
            # Find unanswered players
            unanswered_ids = [
                pid for pid in room.players.keys()
                if pid not in room.answers
            ]
            
            if unanswered_ids:
                logger.info(f'Timeout: {len(unanswered_ids)} players haven\'t answered '
                           f'in room {room_id}')
                
                # Mark unanswered players as incorrect
                for player_id in unanswered_ids:
                    player = room.players.get(player_id)
                    if player:
                        room.answers[player_id] = Answer(
                            answer_index=-1,
                            time_taken=10.0,
                            is_correct=False,
                            player_name=player.name,
                        )
                        player.current_round_score = 0
                
                # Broadcast updated room state
                await self._broadcast_to_room(room_id, 'room-updated', room.to_dict())
                
                # Finalize round scores
                self.game_state.finalize_round(room_id)
                
                # Broadcast again with updated scores
                await self._broadcast_to_room(room_id, 'room-updated', room.to_dict())
                
                # Notify players to show answers
                await self._broadcast_to_room(room_id, 'all-answers-submitted', {})
                
                # Wait and then advance to next round
                await asyncio.sleep(3)
                await self._next_round(room_id)
        
        except asyncio.CancelledError:
            logger.info(f'Round timeout cancelled for room {room_id}')
    
    async def handle_submit_answer(self, player_id: str, data: dict):
        """Handle answer submission"""
        room_id = data.get('roomId')
        answer_index = data.get('answerIndex')
        time_taken = data.get('timeTaken')
        
        room = self.game_state.get_room(room_id)
        if not room or not room.round_started:
            logger.warning(f'Room {room_id} not found or round not started')
            return
        
        player = room.players.get(player_id)
        if not player:
            logger.warning(f'Player {player_id} not in room {room_id}, ignoring answer')
            return
        
        # Submit answer
        self.game_state.submit_answer(room_id, player_id, answer_index, time_taken)
        
        # Broadcast updated room state
        await self._broadcast_to_room(room_id, 'room-updated', room.to_dict())
        
        logger.info(f'Player {player.name} answered in room {room_id}. '
                   f'Answers: {len(room.answers)}/{len(room.players)}')
        
        # Check if all players answered
        if self.game_state.all_players_answered(room_id):
            logger.info(f'All players answered in room {room_id}, showing answers')
            
            # Finalize round scores
            self.game_state.finalize_round(room_id)
            
            # Broadcast updated scores
            await self._broadcast_to_room(room_id, 'room-updated', room.to_dict())
            
            # Notify players to show answers
            await self._broadcast_to_room(room_id, 'all-answers-submitted', {})
            
            # Cancel timeout task if it exists
            if room.round_timeout_task:
                room.round_timeout_task.cancel()
                room.round_timeout_task = None
            
            # Wait 3 seconds then move to next round
            await asyncio.sleep(3)
            await self._next_round(room_id)
    
    async def handle_next_round(self, player_id: str, data: dict):
        """Handle next round request"""
        room_id = data.get('roomId')
        await self._next_round(room_id)
    
    async def _next_round(self, room_id: str):
        """Advance to next round or end game"""
        room = self.game_state.get_room(room_id)
        if not room:
            return
        
        # Advance round
        game_continues = self.game_state.advance_round(room_id)
        
        if not game_continues:
            # Game over
            logger.info(f'Game over in room {room_id}')
            
            # Get sorted leaderboard
            leaderboard = sorted(
                room.players.values(),
                key=lambda p: p.score,
                reverse=True
            )
            
            # Broadcast game over
            await self._broadcast_to_room(room_id, 'game-over', {
                'players': [
                    {
                        'id': p.id,
                        'name': p.name,
                        'score': p.score,
                    }
                    for p in leaderboard
                ]
            })
        else:
            # Load next round
            await self._load_round(room_id)
    
    async def handle_disconnect(self, player_id: str):
        """Handle player disconnection"""
        logger.info(f'Player disconnected: {player_id}')
        
        # Remove from any room they're in
        room_id = await self._remove_from_any_room(player_id)
        
        if room_id:
            logger.info(f'Cleaned up room {room_id} after disconnect')
