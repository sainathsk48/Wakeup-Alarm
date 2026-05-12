/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChallengeType, Difficulty } from './types';

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CHALLENGES: { type: ChallengeType; label: string; icon: string }[] = [
  { type: 'math', label: 'Math Puzzle', icon: 'Calculator' },
  { type: 'memory', label: 'Memory Sequence', icon: 'Brain' },
  { type: 'coding', label: 'Coding Logic', icon: 'Code' },
  { type: 'camera', label: 'Camera Task', icon: 'Camera' },
];

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
