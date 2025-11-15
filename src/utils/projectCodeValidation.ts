/**
 * Project Code Validation Utilities
 * Handles state-based project code generation, validation, and parsing
 *
 * Format: {StatePrefix}{4-digit number}
 * Examples:
 *   PV1296 - Victoria, project 1296
 *   PN2001 - NSW, project 2001
 *   PSA0045 - South Australia, project 0045
 *   PQ3012 - Queensland, project 3012
 */

import type { ProjectState } from '../types/data';

export type StatePrefix = 'PV' | 'PN' | 'PSA' | 'PQ';

/**
 * Map project states to their code prefixes
 */
const STATE_PREFIX_MAP: Record<ProjectState, StatePrefix> = {
  Victoria: 'PV',
  NSW: 'PN',
  'South Australia': 'PSA',
  Queensland: 'PQ',
};

/**
 * Map code prefixes back to project states
 */
const PREFIX_STATE_MAP: Record<StatePrefix, ProjectState> = {
  PV: 'Victoria',
  PN: 'NSW',
  PSA: 'South Australia',
  PQ: 'Queensland',
};

/**
 * Validate a project code format
 * @param code - The project code to validate
 * @returns true if the code matches the pattern, false otherwise
 *
 * @example
 * validateProjectCode('PV1296'); // true
 * validateProjectCode('PN2001'); // true
 * validateProjectCode('PSA0045'); // true
 * validateProjectCode('PQ3012'); // true
 * validateProjectCode('PW001'); // false
 * validateProjectCode('PV99'); // false
 */
export function validateProjectCode(code: string): boolean {
  const regex = /^P(V|N|SA|Q)\d{4}$/;
  return regex.test(code);
}

/**
 * Extract the state from a project code
 * @param code - The project code
 * @returns The ProjectState if valid, null otherwise
 *
 * @example
 * getStateFromCode('PV1296'); // 'Victoria'
 * getStateFromCode('PN2001'); // 'NSW'
 * getStateFromCode('INVALID'); // null
 */
export function getStateFromCode(code: string): ProjectState | null {
  if (!validateProjectCode(code)) return null;

  if (code.startsWith('PV')) return 'Victoria';
  if (code.startsWith('PN')) return 'NSW';
  if (code.startsWith('PSA')) return 'South Australia';
  if (code.startsWith('PQ')) return 'Queensland';

  return null;
}

/**
 * Extract the numeric portion from a project code
 * @param code - The project code
 * @returns The 4-digit number if valid, null otherwise
 *
 * @example
 * getNumberFromCode('PV1296'); // 1296
 * getNumberFromCode('PSA0045'); // 45
 * getNumberFromCode('INVALID'); // null
 */
export function getNumberFromCode(code: string): number | null {
  if (!validateProjectCode(code)) return null;

  const match = code.match(/\d{4}$/);
  if (!match) return null;

  return parseInt(match[0], 10);
}

/**
 * Format a project code from state and number
 * @param state - The project state
 * @param number - The 4-digit project number
 * @returns The formatted project code
 *
 * @example
 * formatProjectCode('Victoria', 1296); // 'PV1296'
 * formatProjectCode('NSW', 2001); // 'PN2001'
 * formatProjectCode('South Australia', 45); // 'PSA0045'
 */
export function formatProjectCode(state: ProjectState, number: number): string {
  const prefix = getPrefixForState(state);
  return `${prefix}${number.toString().padStart(4, '0')}`;
}

/**
 * Get the code prefix for a state
 * @param state - The project state
 * @returns The state prefix
 *
 * @example
 * getPrefixForState('Victoria'); // 'PV'
 * getPrefixForState('NSW'); // 'PN'
 * getPrefixForState('South Australia'); // 'PSA'
 * getPrefixForState('Queensland'); // 'PQ'
 */
export function getPrefixForState(state: ProjectState): StatePrefix {
  return STATE_PREFIX_MAP[state];
}

/**
 * Get the state for a code prefix
 * @param prefix - The state prefix
 * @returns The project state
 *
 * @example
 * getStateForPrefix('PV'); // 'Victoria'
 * getStateForPrefix('PN'); // 'NSW'
 * getStateForPrefix('PSA'); // 'South Australia'
 * getStateForPrefix('PQ'); // 'Queensland'
 */
export function getStateForPrefix(prefix: StatePrefix): ProjectState {
  return PREFIX_STATE_MAP[prefix];
}

/**
 * Generate the next project code for a given state
 * @param state - The project state
 * @param existingCodes - Array of existing project codes to find max number
 * @returns The next available project code
 *
 * @example
 * generateNextProjectCode('Victoria', ['PV1000', 'PV1001', 'PV1002']); // 'PV1003'
 * generateNextProjectCode('NSW', ['PN0001', 'PN0050']); // 'PN0051'
 */
export function generateNextProjectCode(state: ProjectState, existingCodes: string[]): string {
  const prefix = getPrefixForState(state);

  // Filter codes that start with this state's prefix
  const stateCodes = existingCodes.filter((code) => code.startsWith(prefix));

  // Extract numbers and find max
  const numbers = stateCodes
    .map((code) => getNumberFromCode(code))
    .filter((num) => num !== null) as number[];

  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNumber = maxNumber + 1;

  return formatProjectCode(state, nextNumber);
}

/**
 * Get all valid state prefixes
 * @returns Array of valid state prefixes
 */
export function getValidPrefixes(): StatePrefix[] {
  return Object.keys(PREFIX_STATE_MAP) as StatePrefix[];
}

/**
 * Get all valid states
 * @returns Array of valid states
 */
export function getValidStates(): ProjectState[] {
  return Object.keys(STATE_PREFIX_MAP) as ProjectState[];
}
