# Holiday Wars - Multiplayer Prototype

A minimal browser game multiplayer prototype built with TypeScript, HTML Canvas, and NetplayJS.

## Overview

This project demonstrates a clean architecture for building synchronized multiplayer games where:

- **Two teams** play against each other online
- Each team can have **up to 6 local players** on one machine
- Players use **gamepads or keyboard** for input
- The game uses a **deterministic simulation** for network synchronization

## Features

- 🎮 **Multi-controller support**: Up to 6 gamepads + keyboard per team
- 🔄 **Deterministic simulation**: Identical game states across all clients
- 🎯 **Drop-in players**: Press any button to join mid-game
- 📡 **NetplayJS integration**: Room-based matchmaking with rollback/lockstep

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Running Locally

1. Start the dev server: `npm run dev`
2. Open http://localhost:3000 in your browser
3. Click "Solo Practice" to test locally, or:
   - Click "Host Match" in one browser tab
   - Enter the room code in another tab and click "Join Match"

## Project Structure

```
├── index.html          # Main HTML with canvas and lobby UI
├── src/
│   ├── main.ts         # Entry point, app bootstrap
│   ├── gameState.ts    # Type definitions for game state
│   ├── simulation.ts   # Deterministic simulation logic
│   ├── input.ts        # Gamepad + keyboard input handling
│   ├── netplay.ts      # NetplayJS integration wrapper
│   ├── render.ts       # Canvas rendering
│   └── loop.ts         # Fixed timestep game loop
├── package.json        # Project dependencies
├── tsconfig.json       # TypeScript configuration
└── vite.config.ts      # Vite bundler configuration
```

## Architecture

### Deterministic Simulation

The core simulation in `simulation.ts` is completely deterministic:

```typescript
function simulateStep(
  previous: GameState,
  commands: Map<string, PlayerCommand>
): GameState;
```

- No `Date.now()` or `Math.random()` inside simulation
- All state changes are purely functional
- Given the same inputs, produces identical outputs

### Input Pipeline

```
Devices (Gamepad/Keyboard) 
    → InputManager 
    → Local Commands 
    → NetplayJS 
    → Combined Commands 
    → simulateStep()
```

### Game State

```typescript
interface GameState {
  tick: number;
  players: PlayerState[];
}

interface PlayerState {
  id: PlayerId;      // { team: 'A' | 'B', slot: 0-5 }
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  active: boolean;
}
```

### NetplayJS Integration

NetplayJS handles:
- Room creation and joining
- Input synchronization between peers
- Lag compensation / rollback (if supported)

Each tick:
1. Collect local `PlayerCommand`s
2. Send to NetplayJS
3. Receive combined commands from both teams
4. Run `simulateStep(previousState, combinedCommands)`

## Controls

### Keyboard (Player 1)
- **WASD** or **Arrow Keys**: Move

### Gamepad (Players 1-6)
- **Left Stick** or **D-Pad**: Move
- **Any Button**: Join the match

## Building for GitHub Pages

```bash
# Build static bundle
npm run build

# The dist/ folder can be deployed to GitHub Pages
```

Configure GitHub Pages to serve from the `dist/` directory or copy its contents to your `gh-pages` branch.

## Technical Notes

### Fixed Timestep

The game runs at 60 Hz fixed timestep:
- Uses `requestAnimationFrame` for visual rendering
- Maintains an accumulator for consistent physics
- Prevents spiral of death with capped accumulator

### Player Slots

Each team has 6 pre-allocated player slots:
- Slots are activated when a controller/keyboard is used
- Team A slots start on the left side
- Team B slots start on the right side

### Gamepad API

Uses the standard Gamepad API:
- `navigator.getGamepads()` for reading state
- `gamepadconnected` / `gamepaddisconnected` events
- Supports analog sticks with deadzone filtering
- Supports D-pad via standard button indices

## License

MIT License - see LICENSE file for details.
