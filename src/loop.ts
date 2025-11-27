/**
 * Game Loop Module
 * 
 * Implements a fixed timestep game loop that:
 * 1. Collects local input via InputManager
 * 2. Sends input to NetplayJS
 * 3. Receives combined inputs from NetplayJS
 * 4. Runs the deterministic simulation
 * 5. Renders the current state
 */

import { GameState, TeamId, PlayerSlotIndex } from './gameState';
import { simulateStep, createInitialState, activatePlayer } from './simulation';
import { InputManager } from './input';
import { render } from './render';

/** Target frame rate for simulation */
const TARGET_FPS = 60;
const MS_PER_FRAME = 1000 / TARGET_FPS;

/**
 * GameLoop class manages the main game update cycle
 */
export class GameLoop {
  private ctx: CanvasRenderingContext2D;
  private inputManager: InputManager;
  private gameState: GameState;
  private localTeam: TeamId;
  private running: boolean = false;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private animationFrameId: number | null = null;

  // For standalone mode (no netplay)
  private isStandalone: boolean;

  constructor(
    canvas: HTMLCanvasElement,
    localTeam: TeamId,
    standalone: boolean = true
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D canvas context');
    }
    this.ctx = ctx;
    this.localTeam = localTeam;
    this.inputManager = new InputManager(localTeam);
    this.gameState = createInitialState();
    this.isStandalone = standalone;

    // Set up player join callback
    this.inputManager.setOnPlayerJoined((slot: PlayerSlotIndex) => {
      this.gameState = activatePlayer(this.gameState, this.localTeam, slot);
    });
  }

  /**
   * Gets the current game state
   */
  getState(): GameState {
    return this.gameState;
  }

  /**
   * Gets the input manager
   */
  getInputManager(): InputManager {
    return this.inputManager;
  }

  /**
   * Starts the game loop
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  /**
   * Stops the game loop
   */
  stop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Main loop using requestAnimationFrame
   */
  private loop = (): void => {
    if (!this.running) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Accumulate time and run fixed timestep updates
    this.accumulator += deltaTime;

    // Prevent spiral of death by capping accumulator
    if (this.accumulator > MS_PER_FRAME * 5) {
      this.accumulator = MS_PER_FRAME * 5;
    }

    while (this.accumulator >= MS_PER_FRAME) {
      this.update();
      this.accumulator -= MS_PER_FRAME;
    }

    // Render current state
    this.render();

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Fixed timestep update
   */
  private update(): void {
    // Poll local input
    const localCommands = this.inputManager.poll();

    if (this.isStandalone) {
      // In standalone mode, we only have local commands
      this.gameState = simulateStep(this.gameState, localCommands);
    } else {
      // In networked mode, this would be handled by NetplayJS
      // The combined commands would come from NetplayJS after sync
      this.gameState = simulateStep(this.gameState, localCommands);
    }
  }

  /**
   * Render the current game state
   */
  private render(): void {
    render(this.gameState, this.ctx, this.localTeam);
  }

  /**
   * Manually add a keyboard player
   */
  addKeyboardPlayer(): void {
    const slot = this.inputManager.addKeyboardPlayer();
    if (slot !== null) {
      this.gameState = activatePlayer(this.gameState, this.localTeam, slot);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    this.inputManager.destroy();
  }
}
