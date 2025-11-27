/**
 * Game State Types
 * 
 * This module defines all the core types for the game state, player state,
 * and player commands used in the deterministic simulation.
 */

/** Team identifier - either Team A (host) or Team B (joiner) */
export type TeamId = 'A' | 'B';

/** Player slot index (0-5, supporting up to 6 local players per team) */
export type PlayerSlotIndex = 0 | 1 | 2 | 3 | 4 | 5;

/** Unique identifier for a player combining team and slot */
export interface PlayerId {
  team: TeamId;
  slot: PlayerSlotIndex;
}

/** State of a single player in the game */
export interface PlayerState {
  id: PlayerId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  active: boolean;
}

/** Complete game state for a single simulation tick */
export interface GameState {
  tick: number;
  players: PlayerState[];
}

/** Commands from a single player for one tick */
export interface PlayerCommand {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/** Default empty command (no input) */
export const EMPTY_COMMAND: PlayerCommand = {
  up: false,
  down: false,
  left: false,
  right: false,
};

/**
 * Creates a string key for a player ID (used in command maps)
 */
export function playerIdToKey(id: PlayerId): string {
  return `${id.team}:${id.slot}`;
}

/**
 * Parses a player ID key back to a PlayerId object
 */
export function keyToPlayerId(key: string): PlayerId {
  const [team, slotStr] = key.split(':');
  return {
    team: team as TeamId,
    slot: parseInt(slotStr, 10) as PlayerSlotIndex,
  };
}

/** Maximum number of players per team */
export const MAX_PLAYERS_PER_TEAM = 6;

/** Team A color (blue variants) */
export const TEAM_A_COLORS = [
  '#3498db', // Blue
  '#2980b9', // Darker Blue
  '#1abc9c', // Teal
  '#16a085', // Dark Teal
  '#9b59b6', // Purple
  '#8e44ad', // Dark Purple
];

/** Team B color (red variants) */
export const TEAM_B_COLORS = [
  '#e74c3c', // Red
  '#c0392b', // Dark Red
  '#e67e22', // Orange
  '#d35400', // Dark Orange
  '#f1c40f', // Yellow
  '#f39c12', // Dark Yellow
];

/**
 * Gets the color for a player based on team and slot
 */
export function getPlayerColor(team: TeamId, slot: PlayerSlotIndex): string {
  const colors = team === 'A' ? TEAM_A_COLORS : TEAM_B_COLORS;
  return colors[slot] ?? colors[0];
}
