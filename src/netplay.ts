/**
 * NetplayJS Integration
 * 
 * This module wraps NetplayJS functionality for room creation, joining,
 * and synchronized input exchange between two browser clients.
 * 
 * Architecture:
 * - Host (Team A) creates a room and gets a room code
 * - Joiner (Team B) enters the room code to connect
 * - Both sides exchange inputs per tick via NetplayJS
 * - NetplayJS handles synchronization, lag compensation, and rollback
 * 
 * The Game class extends netplayjs.Game and uses the standard pattern:
 * - Constructor initializes game state
 * - tick(playerInputs) advances simulation with synced inputs
 * - draw(canvas) renders current state
 * - serialize/deserialize handle state snapshots for rollback
 */

import { Game, DefaultInput, NetplayPlayer, RollbackWrapper } from 'netplayjs';
import { TeamId, PlayerSlotIndex, MAX_PLAYERS_PER_TEAM, playerIdToKey, PlayerCommand } from './gameState';
import { createInitialState, simulateStep, activatePlayer, ARENA_WIDTH, ARENA_HEIGHT, serializeState } from './simulation';
import type { GameState } from './gameState';
import { render } from './render';

/**
 * Holiday Wars Game class for NetplayJS
 * 
 * This class manages the game state and follows NetplayJS conventions:
 * - State is stored as instance properties
 * - tick() receives playerInputs map and updates state
 * - draw() renders current state to canvas
 */
export class HolidayWarsGame extends Game {
  // Game state - stored as class properties for serialization
  public gameState: GameState;
  
  // Track active slots per player (player 0 = Team A, player 1 = Team B)
  private activeSlots: boolean[][] = [
    Array(MAX_PLAYERS_PER_TEAM).fill(false),
    Array(MAX_PLAYERS_PER_TEAM).fill(false),
  ];

  // Static configuration required by NetplayJS
  static timestep = 1000 / 60; // 60 Hz
  static canvasSize = { width: ARENA_WIDTH, height: ARENA_HEIGHT };
  static deterministic = true; // Our simulation is deterministic

  constructor(_canvas: HTMLCanvasElement, _players: Array<NetplayPlayer>) {
    super();
    this.gameState = createInitialState();
  }

  /**
   * Main tick function - called by NetplayJS with synchronized inputs
   * 
   * @param playerInputs - Map of NetplayPlayer -> DefaultInput for all players
   */
  tick(playerInputs: Map<NetplayPlayer, DefaultInput>): void {
    // Combine commands from both teams into the format expected by simulateStep
    const commands = new Map<string, PlayerCommand>();

    for (const [player, input] of playerInputs.entries()) {
      // Determine team based on player index (0 = Team A, 1 = Team B)
      const playerIndex = player.getID();
      const team: TeamId = playerIndex === 0 ? 'A' : 'B';
      
      // DefaultInput uses keysHeld for currently pressed keys
      const keysHeld = input.keysHeld;

      // Check if this player is trying to join (any movement key pressed)
      const wantsToJoin = keysHeld['KeyW'] || keysHeld['KeyS'] || keysHeld['KeyA'] || keysHeld['KeyD'] ||
                         keysHeld['ArrowUp'] || keysHeld['ArrowDown'] || keysHeld['ArrowLeft'] || keysHeld['ArrowRight'];

      // Find the first unactive slot for this player
      if (wantsToJoin) {
        let hasActiveSlot = false;
        for (let slot = 0; slot < MAX_PLAYERS_PER_TEAM; slot++) {
          if (this.activeSlots[playerIndex][slot]) {
            hasActiveSlot = true;
            break;
          }
        }

        if (!hasActiveSlot) {
          // Activate the first available slot
          for (let slot = 0; slot < MAX_PLAYERS_PER_TEAM; slot++) {
            if (!this.activeSlots[playerIndex][slot]) {
              this.activeSlots[playerIndex][slot] = true;
              this.gameState = activatePlayer(this.gameState, team, slot as PlayerSlotIndex);
              break;
            }
          }
        }
      }

      // Create command from input for the first active slot
      // (In a full implementation, each controller would map to a separate slot)
      for (let slot = 0; slot < MAX_PLAYERS_PER_TEAM; slot++) {
        if (this.activeSlots[playerIndex][slot]) {
          const key = playerIdToKey({ team, slot: slot as PlayerSlotIndex });
          const command: PlayerCommand = {
            up: keysHeld['KeyW'] || keysHeld['ArrowUp'] || false,
            down: keysHeld['KeyS'] || keysHeld['ArrowDown'] || false,
            left: keysHeld['KeyA'] || keysHeld['ArrowLeft'] || false,
            right: keysHeld['KeyD'] || keysHeld['ArrowRight'] || false,
          };
          commands.set(key, command);
          break; // Only first active slot uses keyboard for now
        }
      }
    }

    // Run the deterministic simulation step
    this.gameState = simulateStep(this.gameState, commands);
  }

  /**
   * Render the game state to canvas
   */
  draw(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // We don't know which team we are in draw(), but we can render generically
    render(this.gameState, ctx);
  }

  /**
   * Serialize game state for network transmission / rollback
   */
  serialize() {
    return {
      gameState: JSON.parse(serializeState(this.gameState)),
      activeSlots: this.activeSlots,
    };
  }

  /**
   * Deserialize game state from network / rollback
   */
  deserialize(value: unknown): void {
    const data = value as { gameState: GameState; activeSlots: boolean[][] };
    this.gameState = data.gameState;
    this.activeSlots = data.activeSlots;
  }
}

/**
 * Starts the game with NetplayJS RollbackWrapper
 * This handles matchmaking UI, WebRTC connection, and netcode
 */
export function startNetplayGame(): void {
  new RollbackWrapper(HolidayWarsGame).start();
}

