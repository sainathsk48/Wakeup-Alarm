/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ChallengeType = 'math' | 'memory' | 'coding' | 'camera';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Alarm {
  id: string;
  time: string; // ISO string or HH:mm
  days: number[]; // 0-6 for Sun-Sat
  enabled: boolean;
  label: string;
  difficulty: Difficulty;
  challengeType: ChallengeType | 'random';
}

export interface UserStats {
  userId?: string;
  totalAlarmsSet: number;
  alarmsCompleted: number;
  streak: number;
  lastCompletedDate?: string | null;
}
