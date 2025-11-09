from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime


@dataclass
class Player:
    """Represents a player in the game"""
    id: str  # Socket ID
    name: str
    score: int = 0
    current_round_score: int = 0
    is_ready: bool = False


@dataclass
class Answer:
    """Represents a player's answer to a round"""
    answer_index: int
    time_taken: float
    is_correct: bool
    player_name: str


@dataclass
class GameRoom:
    """Represents a multiplayer game room"""
    id: str
    host_id: str
    players: Dict[str, Player] = field(default_factory=dict)
    current_round: int = 0
    total_rounds: int = 10
    genre: str = 'any'
    type: str = 'any'
    current_track: Optional[Dict[str, Any]] = None
    options: List[Dict[str, Any]] = field(default_factory=list)
    game_mode: Optional[str] = None
    round_started: bool = False
    answers: Dict[str, Answer] = field(default_factory=dict)
    game_finished: bool = False
    round_timeout_task: Optional[Any] = None
    round_start_time: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert room state to dictionary for emitting to clients"""
        return {
            'roomId': self.id,
            'hostId': self.host_id,
            'players': [
                {
                    'id': player.id,
                    'name': player.name,
                    'score': player.score,
                    'currentRoundScore': player.current_round_score,
                    'isReady': player.is_ready,
                }
                for player in self.players.values()
            ],
            'currentRound': self.current_round,
            'totalRounds': self.total_rounds,
            'genre': self.genre,
            'type': self.type,
            'currentTrack': self.current_track,
            'options': self.options,
            'gameMode': self.game_mode,
            'roundStarted': self.round_started,
            'answers': [
                {
                    'playerId': player_id,
                    'answerIndex': answer.answer_index,
                    'timeTaken': answer.time_taken,
                    'isCorrect': answer.is_correct,
                    'playerName': answer.player_name,
                }
                for player_id, answer in self.answers.items()
            ],
            'gameOver': self.current_round >= self.total_rounds,
        }
