/**
 * Main Entry Point
 * 
 * Bootstraps the lobby UI, handles room creation/joining via NetplayJS,
 * and initializes the game loop when a match starts.
 * 
 * This file provides two modes:
 * 1. NetplayJS mode - Uses RollbackWrapper for real multiplayer
 * 2. Solo mode - Local testing without network
 */

import {
  PlayerSlotIndex,
  TeamId,
} from './gameState';
import { createInitialState, simulateStep, activatePlayer } from './simulation';
import { InputManager } from './input';
import { render, renderLobby } from './render';
import { HolidayWarsGame, startNetplayGame } from './netplay';
import type { GameState } from './gameState';
import { ARENA_WIDTH, ARENA_HEIGHT } from './simulation';

// Re-export constants for external use
export { ARENA_WIDTH, ARENA_HEIGHT };

/**
 * Main application class
 */
class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lobbyDiv: HTMLElement;
  private gameDiv: HTMLElement;
  private inputManager: InputManager | null = null;
  private gameState: GameState | null = null;
  private localTeam: TeamId = 'A';
  private running: boolean = false;
  private lastTime: number = 0;
  private accumulator: number = 0;

  constructor() {
    // Get DOM elements
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.lobbyDiv = document.getElementById('lobby') as HTMLElement;
    this.gameDiv = document.getElementById('game') as HTMLElement;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D canvas context');
    }
    this.ctx = ctx;

    this.setupEventListeners();
    this.showLobby();
  }

  /**
   * Set up UI event listeners
   */
  private setupEventListeners(): void {
    // Host button - starts NetplayJS multiplayer
    const hostBtn = document.getElementById('hostBtn');
    hostBtn?.addEventListener('click', () => this.startNetplay());

    // Join button - starts NetplayJS multiplayer (same as host, NetplayJS handles joining)
    const joinBtn = document.getElementById('joinBtn');
    joinBtn?.addEventListener('click', () => this.startNetplay());

    // Solo button (for testing without network)
    const soloBtn = document.getElementById('soloBtn');
    soloBtn?.addEventListener('click', () => this.startSolo());

    // Room code input - enter key
    const roomCodeInput = document.getElementById('roomCode') as HTMLInputElement;
    roomCodeInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.startNetplay();
      }
    });
  }

  /**
   * Show the lobby UI
   */
  private showLobby(): void {
    this.lobbyDiv.style.display = 'block';
    this.gameDiv.style.display = 'none';
    renderLobby(this.ctx, 'Welcome! Host or join a match.');
  }

  /**
   * Show the game UI
   */
  private showGame(): void {
    this.lobbyDiv.style.display = 'none';
    this.gameDiv.style.display = 'block';
  }

  /**
   * Start NetplayJS multiplayer mode
   * This hides our custom lobby and lets NetplayJS handle matchmaking
   */
  private startNetplay(): void {
    this.lobbyDiv.style.display = 'none';
    this.gameDiv.style.display = 'none';
    
    // NetplayJS will create its own UI and canvas
    startNetplayGame();
  }

  /**
   * Start in solo mode (for testing without network)
   */
  private startSolo(): void {
    this.localTeam = 'A';
    this.startLocalGame();
  }

  /**
   * Start the local game (solo mode)
   */
  private startLocalGame(): void {
    this.showGame();
    this.inputManager = new InputManager(this.localTeam);
    this.gameState = createInitialState();

    // Set up player join callback
    this.inputManager.setOnPlayerJoined((slot: PlayerSlotIndex) => {
      if (this.gameState) {
        this.gameState = activatePlayer(this.gameState, this.localTeam, slot);
      }
    });

    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  /**
   * Main game loop for solo mode
   */
  private gameLoop = (): void => {
    if (!this.running || !this.gameState || !this.inputManager) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Fixed timestep
    const MS_PER_FRAME = 1000 / 60;
    this.accumulator += deltaTime;

    if (this.accumulator > MS_PER_FRAME * 5) {
      this.accumulator = MS_PER_FRAME * 5;
    }

    while (this.accumulator >= MS_PER_FRAME) {
      // Poll input and simulate
      const localCommands = this.inputManager.poll();
      this.gameState = simulateStep(this.gameState, localCommands);
      this.accumulator -= MS_PER_FRAME;
    }

    // Render
    render(this.gameState, this.ctx, this.localTeam);

    requestAnimationFrame(this.gameLoop);
  };
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});

// Export for potential external use
export { HolidayWarsGame };
