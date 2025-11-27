/**
 * Input Manager
 * 
 * Handles gamepad and keyboard input, maps them to player commands,
 * and manages local player slot assignments with drop-in support.
 */

import {
  PlayerCommand,
  TeamId,
  PlayerSlotIndex,
  MAX_PLAYERS_PER_TEAM,
  playerIdToKey,
  EMPTY_COMMAND,
} from './gameState';

/** Deadzone for analog sticks */
const STICK_DEADZONE = 0.25;

/** Keyboard mappings for the first player (keyboard player) */
const KEYBOARD_MAPPINGS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
};

/** Tracks the current state of pressed keys */
const pressedKeys = new Set<string>();

/** Local player slot assignment */
interface LocalSlotAssignment {
  slot: PlayerSlotIndex;
  inputSource: 'keyboard' | GamepadAssignment;
}

interface GamepadAssignment {
  type: 'gamepad';
  gamepadIndex: number;
}

/**
 * Input Manager class
 * Manages input devices and converts them to player commands
 */
export class InputManager {
  private localTeam: TeamId;
  private assignments: LocalSlotAssignment[] = [];
  private gamepadLastButtonState: Map<number, boolean[]> = new Map();
  private onPlayerJoined?: (slot: PlayerSlotIndex) => void;

  constructor(team: TeamId) {
    this.localTeam = team;
    this.setupKeyboardListeners();
    this.setupGamepadListeners();
  }

  /**
   * Sets a callback for when a new local player joins
   */
  setOnPlayerJoined(callback: (slot: PlayerSlotIndex) => void) {
    this.onPlayerJoined = callback;
  }

  /**
   * Gets the local team ID
   */
  getLocalTeam(): TeamId {
    return this.localTeam;
  }

  /**
   * Gets all active local player slot indices
   */
  getActiveSlots(): PlayerSlotIndex[] {
    return this.assignments.map(a => a.slot);
  }

  /**
   * Sets up keyboard event listeners
   */
  private setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      pressedKeys.add(e.code);
      
      // Check if keyboard player should join
      const isMovementKey = [
        ...KEYBOARD_MAPPINGS.up,
        ...KEYBOARD_MAPPINGS.down,
        ...KEYBOARD_MAPPINGS.left,
        ...KEYBOARD_MAPPINGS.right,
      ].includes(e.code);

      if (isMovementKey && !this.hasKeyboardAssignment()) {
        this.assignKeyboard();
      }
    });

    window.addEventListener('keyup', (e) => {
      pressedKeys.delete(e.code);
    });
  }

  /**
   * Sets up gamepad connection listeners
   */
  private setupGamepadListeners() {
    window.addEventListener('gamepadconnected', (e) => {
      console.log(`Gamepad connected: ${e.gamepad.id} (index: ${e.gamepad.index})`);
      this.gamepadLastButtonState.set(e.gamepad.index, []);
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      console.log(`Gamepad disconnected: ${e.gamepad.id} (index: ${e.gamepad.index})`);
      this.removeGamepadAssignment(e.gamepad.index);
      this.gamepadLastButtonState.delete(e.gamepad.index);
    });
  }

  /**
   * Checks if keyboard is already assigned to a slot
   */
  private hasKeyboardAssignment(): boolean {
    return this.assignments.some(a => a.inputSource === 'keyboard');
  }

  /**
   * Checks if a gamepad is already assigned to a slot
   */
  private hasGamepadAssignment(gamepadIndex: number): boolean {
    return this.assignments.some(
      a => a.inputSource !== 'keyboard' && a.inputSource.gamepadIndex === gamepadIndex
    );
  }

  /**
   * Gets the next available slot index
   */
  private getNextAvailableSlot(): PlayerSlotIndex | null {
    const usedSlots = new Set(this.assignments.map(a => a.slot));
    for (let i = 0; i < MAX_PLAYERS_PER_TEAM; i++) {
      if (!usedSlots.has(i as PlayerSlotIndex)) {
        return i as PlayerSlotIndex;
      }
    }
    return null;
  }

  /**
   * Assigns keyboard to the next available slot
   */
  private assignKeyboard(): PlayerSlotIndex | null {
    const slot = this.getNextAvailableSlot();
    if (slot === null) {
      console.log('No available slots for keyboard player');
      return null;
    }

    this.assignments.push({
      slot,
      inputSource: 'keyboard',
    });

    console.log(`Keyboard player joined at slot ${slot}`);
    this.onPlayerJoined?.(slot);
    return slot;
  }

  /**
   * Assigns a gamepad to the next available slot
   */
  private assignGamepad(gamepadIndex: number): PlayerSlotIndex | null {
    const slot = this.getNextAvailableSlot();
    if (slot === null) {
      console.log(`No available slots for gamepad ${gamepadIndex}`);
      return null;
    }

    this.assignments.push({
      slot,
      inputSource: { type: 'gamepad', gamepadIndex },
    });

    console.log(`Gamepad ${gamepadIndex} player joined at slot ${slot}`);
    this.onPlayerJoined?.(slot);
    return slot;
  }

  /**
   * Removes a gamepad assignment (when disconnected)
   */
  private removeGamepadAssignment(gamepadIndex: number) {
    const index = this.assignments.findIndex(
      a => a.inputSource !== 'keyboard' && a.inputSource.gamepadIndex === gamepadIndex
    );
    if (index !== -1) {
      const removed = this.assignments.splice(index, 1)[0];
      console.log(`Removed gamepad ${gamepadIndex} from slot ${removed.slot}`);
    }
  }

  /**
   * Reads keyboard state and returns a PlayerCommand
   */
  private readKeyboard(): PlayerCommand {
    return {
      up: KEYBOARD_MAPPINGS.up.some(k => pressedKeys.has(k)),
      down: KEYBOARD_MAPPINGS.down.some(k => pressedKeys.has(k)),
      left: KEYBOARD_MAPPINGS.left.some(k => pressedKeys.has(k)),
      right: KEYBOARD_MAPPINGS.right.some(k => pressedKeys.has(k)),
    };
  }

  /**
   * Reads a gamepad's state and returns a PlayerCommand
   */
  private readGamepad(gamepadIndex: number): PlayerCommand {
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[gamepadIndex];

    if (!gamepad) {
      return EMPTY_COMMAND;
    }

    // Read left stick
    const lx = gamepad.axes[0] ?? 0;
    const ly = gamepad.axes[1] ?? 0;

    // Read D-pad (buttons 12-15 are typically up/down/left/right)
    const dpadUp = gamepad.buttons[12]?.pressed ?? false;
    const dpadDown = gamepad.buttons[13]?.pressed ?? false;
    const dpadLeft = gamepad.buttons[14]?.pressed ?? false;
    const dpadRight = gamepad.buttons[15]?.pressed ?? false;

    return {
      up: ly < -STICK_DEADZONE || dpadUp,
      down: ly > STICK_DEADZONE || dpadDown,
      left: lx < -STICK_DEADZONE || dpadLeft,
      right: lx > STICK_DEADZONE || dpadRight,
    };
  }

  /**
   * Checks for new gamepad button presses and assigns if unassigned
   */
  private checkGamepadJoin() {
    const gamepads = navigator.getGamepads();

    for (let i = 0; i < gamepads.length; i++) {
      const gamepad = gamepads[i];
      if (!gamepad) continue;

      // Skip if already assigned
      if (this.hasGamepadAssignment(i)) continue;

      const lastState = this.gamepadLastButtonState.get(i) ?? [];
      const currentState = gamepad.buttons.map(b => b.pressed);

      // Check for any new button press
      for (let j = 0; j < currentState.length; j++) {
        if (currentState[j] && !lastState[j]) {
          // New button press detected on unassigned gamepad
          this.assignGamepad(i);
          break;
        }
      }

      this.gamepadLastButtonState.set(i, currentState);
    }
  }

  /**
   * Polls all input devices and returns commands for all local players
   * 
   * @returns Map of commands keyed by "team:slot"
   */
  poll(): Map<string, PlayerCommand> {
    // Check for new players joining via gamepad
    this.checkGamepadJoin();

    const commands = new Map<string, PlayerCommand>();

    for (const assignment of this.assignments) {
      const key = playerIdToKey({ team: this.localTeam, slot: assignment.slot });

      if (assignment.inputSource === 'keyboard') {
        commands.set(key, this.readKeyboard());
      } else {
        commands.set(key, this.readGamepad(assignment.inputSource.gamepadIndex));
      }
    }

    return commands;
  }

  /**
   * Manually add a keyboard player (for initial setup)
   */
  addKeyboardPlayer(): PlayerSlotIndex | null {
    if (this.hasKeyboardAssignment()) {
      return null;
    }
    return this.assignKeyboard();
  }

  /**
   * Destroys the input manager and cleans up listeners
   */
  destroy() {
    // Note: We don't remove the keyboard listeners as they're added anonymously
    // In a production app, we'd store references and remove them
    this.assignments = [];
    this.gamepadLastButtonState.clear();
  }
}
