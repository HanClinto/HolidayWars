/**
 * Deterministic Simulation
 * 
 * This module contains the core game simulation logic. All functions here
 * must be pure and deterministic - given the same inputs, they must always
 * produce the same outputs. No Date.now(), Math.random(), or side effects.
 */

import {
  GameState,
  PlayerState,
  PlayerCommand,
  PlayerId,
  TeamId,
  PlayerSlotIndex,
  EMPTY_COMMAND,
  playerIdToKey,
  getPlayerColor,
  MAX_PLAYERS_PER_TEAM,
} from './gameState';

/** Arena dimensions */
export const ARENA_WIDTH = 800;
export const ARENA_HEIGHT = 600;

/** Player dimensions and physics */
export const PLAYER_SIZE = 40;
export const PLAYER_ACCELERATION = 600; // pixels per second^2
export const PLAYER_MAX_SPEED = 300; // pixels per second
export const PLAYER_FRICTION = 0.9; // velocity multiplier per frame

/** Fixed timestep (60 Hz) */
export const FIXED_TIMESTEP = 1 / 60;

/**
 * Creates the initial game state with all player slots pre-allocated
 */
export function createInitialState(): GameState {
  const players: PlayerState[] = [];

  // Create slots for Team A (left side)
  for (let slot = 0; slot < MAX_PLAYERS_PER_TEAM; slot++) {
    const id: PlayerId = { team: 'A', slot: slot as PlayerSlotIndex };
    players.push({
      id,
      x: 100 + (slot % 3) * 50,
      y: 100 + Math.floor(slot / 3) * 100,
      vx: 0,
      vy: 0,
      color: getPlayerColor('A', slot as PlayerSlotIndex),
      active: false,
    });
  }

  // Create slots for Team B (right side)
  for (let slot = 0; slot < MAX_PLAYERS_PER_TEAM; slot++) {
    const id: PlayerId = { team: 'B', slot: slot as PlayerSlotIndex };
    players.push({
      id,
      x: ARENA_WIDTH - 150 + (slot % 3) * 50,
      y: 100 + Math.floor(slot / 3) * 100,
      vx: 0,
      vy: 0,
      color: getPlayerColor('B', slot as PlayerSlotIndex),
      active: false,
    });
  }

  return {
    tick: 0,
    players,
  };
}

/** Spawn position spacing */
const SPAWN_COLUMN_SPACING = 60;
const SPAWN_ROW_SPACING = 120;
const SPAWN_START_Y = 150;

/**
 * Gets spawn position for a player based on team and slot
 */
export function getSpawnPosition(team: TeamId, slot: PlayerSlotIndex): { x: number; y: number } {
  const baseX = team === 'A' ? 100 : ARENA_WIDTH - 150;
  const row = Math.floor(slot / 3);
  const col = slot % 3;
  
  return {
    x: baseX + col * SPAWN_COLUMN_SPACING,
    y: SPAWN_START_Y + row * SPAWN_ROW_SPACING,
  };
}

/**
 * Updates a single player's state based on their command
 * This is a pure function - no side effects
 */
function updatePlayer(
  player: PlayerState,
  command: PlayerCommand,
  dt: number
): PlayerState {
  if (!player.active) {
    return player;
  }

  let { vx, vy } = player;

  // Apply acceleration based on input
  if (command.left) {
    vx -= PLAYER_ACCELERATION * dt;
  }
  if (command.right) {
    vx += PLAYER_ACCELERATION * dt;
  }
  if (command.up) {
    vy -= PLAYER_ACCELERATION * dt;
  }
  if (command.down) {
    vy += PLAYER_ACCELERATION * dt;
  }

  // Apply friction
  vx *= PLAYER_FRICTION;
  vy *= PLAYER_FRICTION;

  // Clamp to max speed
  const speed = Math.sqrt(vx * vx + vy * vy);
  if (speed > PLAYER_MAX_SPEED) {
    const scale = PLAYER_MAX_SPEED / speed;
    vx *= scale;
    vy *= scale;
  }

  // Update position
  let x = player.x + vx * dt;
  let y = player.y + vy * dt;

  // Clamp to arena bounds
  const halfSize = PLAYER_SIZE / 2;
  if (x < halfSize) {
    x = halfSize;
    vx = 0;
  }
  if (x > ARENA_WIDTH - halfSize) {
    x = ARENA_WIDTH - halfSize;
    vx = 0;
  }
  if (y < halfSize) {
    y = halfSize;
    vy = 0;
  }
  if (y > ARENA_HEIGHT - halfSize) {
    y = ARENA_HEIGHT - halfSize;
    vy = 0;
  }

  return {
    ...player,
    x,
    y,
    vx,
    vy,
  };
}

/**
 * Main simulation step - advances the game state by one tick
 * 
 * This function MUST be deterministic: given the same previous state
 * and commands, it must always produce the same result.
 * 
 * @param previous - The previous game state
 * @param commands - Map of player commands keyed by "team:slot" (e.g., "A:0", "B:3")
 * @returns The new game state after one simulation step
 */
export function simulateStep(
  previous: GameState,
  commands: Map<string, PlayerCommand>
): GameState {
  const dt = FIXED_TIMESTEP;

  // Update each player
  const updatedPlayers = previous.players.map(player => {
    const key = playerIdToKey(player.id);
    const command = commands.get(key) ?? EMPTY_COMMAND;
    return updatePlayer(player, command, dt);
  });

  return {
    tick: previous.tick + 1,
    players: updatedPlayers,
  };
}

/**
 * Activates a player slot (when a local player joins)
 */
export function activatePlayer(
  state: GameState,
  team: TeamId,
  slot: PlayerSlotIndex
): GameState {
  const playerIndex = state.players.findIndex(
    p => p.id.team === team && p.id.slot === slot
  );

  if (playerIndex === -1) {
    return state;
  }

  const player = state.players[playerIndex];
  if (player.active) {
    return state; // Already active
  }

  const spawn = getSpawnPosition(team, slot);
  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = {
    ...player,
    active: true,
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
  };

  return {
    ...state,
    players: updatedPlayers,
  };
}

/**
 * Serializes game state for network transmission
 */
export function serializeState(state: GameState): string {
  return JSON.stringify(state);
}

/**
 * Deserializes game state from network
 */
export function deserializeState(data: string): GameState {
  return JSON.parse(data) as GameState;
}
