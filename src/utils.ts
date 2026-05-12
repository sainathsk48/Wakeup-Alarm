/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const formatTime12h = (time24h: string) => {
  const [hours, minutes] = time24h.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return {
    time: `${hours12}:${minutes.toString().padStart(2, '0')}`,
    period
  };
};

export const convertTo24h = (hours12: number, minutes: number, period: 'AM' | 'PM') => {
  let hours24 = hours12;
  if (period === 'PM' && hours12 < 12) hours24 += 12;
  if (period === 'AM' && hours12 === 12) hours24 = 0;
  return `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};
