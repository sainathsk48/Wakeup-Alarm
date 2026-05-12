/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Difficulty } from '../types';

export const generateMathProblem = (difficulty: Difficulty) => {
  let max = 10;
  if (difficulty === 'medium') max = 50;
  if (difficulty === 'hard') max = 100;

  const a = Math.floor(Math.random() * max) + 1;
  const b = Math.floor(Math.random() * max) + 1;
  const ops = ['+', '-', '*'];
  const op = ops[Math.floor(Math.random() * (difficulty === 'easy' ? 2 : 3))];

  let question = `${a} ${op} ${b}`;
  let answer = 0;

  switch (op) {
    case '+': answer = a + b; break;
    case '-': answer = a - b; break;
    case '*': answer = a * b; break;
  }

  return { question, answer: answer.toString() };
};

export const generateMemorySequence = (difficulty: Difficulty) => {
  let length = 4;
  if (difficulty === 'medium') length = 6;
  if (difficulty === 'hard') length = 8;

  const sequence = Array.from({ length }, () => Math.floor(Math.random() * 9) + 1);
  return sequence;
};

export const CODING_QUESTIONS = [
  {
    question: "What is the result of `[1, 2, 3].map(x => x * 2)`?",
    answer: "[2, 4, 6]",
    difficulty: 'easy'
  },
  {
    question: "What does `typeof null` return in JavaScript?",
    answer: "object",
    difficulty: 'medium'
  },
  {
    question: "What is the value of `x` after: `let x = 10; x += 5 * 2;`?",
    answer: "20",
    difficulty: 'easy'
  },
  {
    question: "What is the output of `console.log(1 + '1')`?",
    answer: "11",
    difficulty: 'easy'
  },
  {
    question: "In CSS, what does `display: flex` do?",
    answer: "layout",
    difficulty: 'easy'
  }
];

export const CAMERA_OBJECTS = [
  'toothbrush',
  'sink',
  'mug',
  'keyboard',
  'bottle',
  'chair'
];

export const getRandomCameraObject = () => {
  return CAMERA_OBJECTS[Math.floor(Math.random() * CAMERA_OBJECTS.length)];
};
