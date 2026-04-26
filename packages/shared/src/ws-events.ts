export const WsEvent = {
  // Client → Server: lobby
  UPDATE_SETTINGS:       'update_settings',
  PLAYER_READY:          'player_ready',
  KICK_PLAYER:           'kick_player',
  START_GAME:            'start_game',

  // Client → Server: game phases (out of scope for lobby plan — defined here to avoid magic strings later)
  PROPOSE_TEAM:          'propose_team',
  VOTE_TEAM:             'vote_team',
  PLAY_QUEST_CARD:       'play_quest_card',
  ASSASSINATE:           'assassinate',
  LADY_EXAMINE:          'lady_examine',

  // Server → Client: lobby
  ROOM_UPDATED:          'room_updated',
  ERROR:                 'error',
  KICKED:                'kicked',
  ROOM_DESTROYED:        'room_destroyed',
  PHASE_CHANGED:         'phase_changed',

  // Server → Client: game phases
  ROLE_ASSIGNED:         'role_assigned',
  TEAM_PROPOSED:         'team_proposed',
  VOTE_REVEALED:         'vote_revealed',
  QUEST_RESULT:          'quest_result',
  CONSECUTIVE_REJECTIONS:'consecutive_rejections',
  ASSASSINATION_PHASE:   'assassination_phase',
  GAME_OVER:             'game_over',
} as const;

export type WsEventName = typeof WsEvent[keyof typeof WsEvent];
