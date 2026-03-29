import { Injectable } from '@nestjs/common';

@Injectable()
export class GameService {
  // Game logic will live here, powered by XState.
  // Each room gets its own actor: Map<roomCode, Actor<typeof gameMachine>>

  getHello(): string {
    return 'Hello from Avalon game service!';
  }
}
