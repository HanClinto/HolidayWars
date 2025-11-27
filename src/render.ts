/**
 * Rendering Module
 * 
 * Handles all canvas drawing operations for the game.
 * This is separated from the simulation to maintain a clean architecture.
 */

import { GameState, TeamId } from './gameState';
import { ARENA_WIDTH, ARENA_HEIGHT, PLAYER_SIZE } from './simulation';

/**
 * Renders the complete game state to the canvas
 */
export function render(
  state: GameState,
  ctx: CanvasRenderingContext2D,
  localTeam?: TeamId
): void {
  // Clear canvas with dark background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  // Draw arena boundary
  ctx.strokeStyle = '#4a4a5e';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, ARENA_WIDTH - 4, ARENA_HEIGHT - 4);

  // Draw center line
  ctx.strokeStyle = '#3a3a4e';
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(ARENA_WIDTH / 2, 0);
  ctx.lineTo(ARENA_WIDTH / 2, ARENA_HEIGHT);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw team zones labels
  ctx.fillStyle = 'rgba(52, 152, 219, 0.1)'; // Light blue
  ctx.fillRect(0, 0, ARENA_WIDTH / 2, ARENA_HEIGHT);
  ctx.fillStyle = 'rgba(231, 76, 60, 0.1)'; // Light red
  ctx.fillRect(ARENA_WIDTH / 2, 0, ARENA_WIDTH / 2, ARENA_HEIGHT);

  // Draw team labels
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
  ctx.fillText('TEAM A', ARENA_WIDTH / 4, 30);
  ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
  ctx.fillText('TEAM B', (ARENA_WIDTH * 3) / 4, 30);

  // Draw each active player
  for (const player of state.players) {
    if (!player.active) continue;

    const { x, y, color, id } = player;
    const halfSize = PLAYER_SIZE / 2;

    // Draw shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x - halfSize + 3, y - halfSize + 3, PLAYER_SIZE, PLAYER_SIZE);

    // Draw player rectangle
    ctx.fillStyle = color;
    ctx.fillRect(x - halfSize, y - halfSize, PLAYER_SIZE, PLAYER_SIZE);

    // Draw border (highlight local team)
    const isLocal = localTeam === id.team;
    ctx.strokeStyle = isLocal ? '#ffffff' : '#888888';
    ctx.lineWidth = isLocal ? 3 : 1;
    ctx.strokeRect(x - halfSize, y - halfSize, PLAYER_SIZE, PLAYER_SIZE);

    // Draw label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${id.team}${id.slot}`, x, y);
  }

  // Draw HUD
  drawHUD(ctx, state, localTeam);
}

/**
 * Draws the heads-up display (tick counter, player count, etc.)
 */
function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  localTeam?: TeamId
): void {
  // Draw tick counter
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`Tick: ${state.tick}`, 10, 10);

  // Count active players per team in a single pass
  const teamCounts = state.players.reduce(
    (counts, p) => {
      if (p.active) {
        if (p.id.team === 'A') counts.a++;
        else counts.b++;
      }
      return counts;
    },
    { a: 0, b: 0 }
  );

  ctx.textAlign = 'right';
  ctx.fillText(`Team A: ${teamCounts.a}/6  |  Team B: ${teamCounts.b}/6`, ARENA_WIDTH - 10, 10);

  // Draw local team indicator
  if (localTeam) {
    ctx.textAlign = 'left';
    ctx.fillStyle = localTeam === 'A' ? '#3498db' : '#e74c3c';
    ctx.fillText(`You are: Team ${localTeam}`, 10, 30);
  }

  // Draw instructions at bottom
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(
    'Press any button/key to join (up to 6 players). Use WASD/Arrows or gamepad to move.',
    ARENA_WIDTH / 2,
    ARENA_HEIGHT - 10
  );
}

/**
 * Renders the lobby screen
 */
export function renderLobby(
  ctx: CanvasRenderingContext2D,
  status: string
): void {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Holiday Wars', ARENA_WIDTH / 2, ARENA_HEIGHT / 2 - 50);

  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#aaaaaa';
  ctx.fillText(status, ARENA_WIDTH / 2, ARENA_HEIGHT / 2 + 20);
}
