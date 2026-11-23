# Avalon

An online version of the hidden-role party game, played on phones around one physical table. Each phone shows only what its player is allowed to know.

## Room and lobby

**Room**:
One table of players, found by a four-letter code. It holds the lobby and, once started, the game.
_Avoid_: Game (for the room itself), session, party

**Seat**:
A player's place in a room, held by a seat token in their browser. There are no accounts; a player is a seat.
_Avoid_: User, account, connection

**Host**:
The seat that controls the lobby: settings, kicks and Start, and Back to lobby after a game. Passes to another seat by a hand-over.
_Avoid_: Owner, admin, creator

**Hand-over**:
The host role passing to another seat: at once when the host leaves, or when the host has been away for 60 seconds and another seat is connected. It never passes back to the old host.
_Avoid_: Transfer, promotion, migration

**Lobby**:
The room before a game starts (and again after play again), where seats gather, ready up and the host picks settings.
_Avoid_: Waiting room

**Ready**:
A non-host seat's declaration that it is happy to start with the current table and settings. Only the seat itself changes it, except that play again clears it for everyone. The host has no ready: pressing Start is the host's ready.
_Avoid_: Confirmed, set

**Away**:
A seat with no open connection right now, for example a phone that went to sleep. The seat is kept and its ready is kept.
_Avoid_: Disconnected, offline, gone, left

**Leave**:
A seat giving itself up in the lobby. The seat is removed, unlike Away. A host who leaves passes host on at once. When the last seat leaves, the room ends.
_Avoid_: Quit, disconnect

**Kick**:
The host removing another seat, connected or away, in the lobby. Nothing is remembered: the same person may join again as a new seat, under any name.
_Avoid_: Ban, remove

**Settings**:
The host's choices for the next game: which optional roles are in, and whether Lady of the Lake is used. Any mix can be saved; whether it can start depends on the seats at the moment of Start.
_Avoid_: Config, options

**Start blocker**:
A reason the host cannot start yet, shown next to Start: too few seats, a seat not ready, a seat away, or more Evil roles than the seats have Evil places for.
_Avoid_: Error, validation

**Settings hint**:
Advice about the settings that never stops Start, for example Lady of the Lake with fewer than 7 seats, or Percival without Morgana. Unlike a start blocker, the table may play on knowingly.
_Avoid_: Warning, soft blocker

**Play again**:
The host returning a finished game's room to the lobby with the same seats.
_Avoid_: Restart, new game
