/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, Settings2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardContent, CardFooter } from './ui/Card';
import { Alarm, ChallengeType, Difficulty } from '../types';
import { DAYS_OF_WEEK, CHALLENGES, DIFFICULTIES } from '../constants';
import { formatTime12h, convertTo24h } from '../utils';

interface AlarmFormProps {
  alarm?: Alarm;
  onSave: (alarm: Partial<Alarm>) => void;
  onCancel: () => void;
}

export const AlarmForm: React.FC<AlarmFormProps> = ({ alarm, onSave, onCancel }) => {
  const [time, setTime] = useState(alarm?.time || '07:00');
  const [label, setLabel] = useState(alarm?.label || '');
  const [days, setDays] = useState<number[]>(alarm?.days || [1, 2, 3, 4, 5]);
  const [difficulty, setDifficulty] = useState<Difficulty>(alarm?.difficulty || 'easy');
  const [challengeType, setChallengeType] = useState<ChallengeType | 'random'>(alarm?.challengeType || 'random');

  // 12h state
  const [hours12, setHours12] = useState(12);
  const [minutes, setMinutes] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    const { time: t12, period: p } = formatTime12h(time);
    const [h, m] = t12.split(':').map(Number);
    setHours12(h);
    setMinutes(m);
    setPeriod(p as 'AM' | 'PM');
  }, [time]);

  const handleTimeChange = (h: number, m: number, p: 'AM' | 'PM') => {
    const time24 = convertTo24h(h, m, p);
    setTime(time24);
  };

  const toggleDay = (day: number) => {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSave = () => {
    onSave({
      time,
      label,
      days,
      difficulty,
      challengeType,
      enabled: true,
    });
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <Card className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl animate-in slide-in-from-bottom duration-300">
        <CardHeader className="flex flex-row items-center justify-between border-none pb-0">
          <h2 className="text-xl font-semibold">{alarm ? 'Edit Alarm' : 'New Alarm'}</h2>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Time Picker */}
          <div className="flex flex-col items-center py-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-zinc-50 rounded-2xl p-4 gap-2">
                <select 
                  value={hours12}
                  onChange={(e) => handleTimeChange(Number(e.target.value), minutes, period)}
                  className="text-5xl font-bold bg-transparent border-none focus:ring-0 outline-none appearance-none cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                    <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>
                  ))}
                </select>
                <span className="text-5xl font-bold text-zinc-300">:</span>
                <select 
                  value={minutes}
                  onChange={(e) => handleTimeChange(hours12, Number(e.target.value), period)}
                  className="text-5xl font-bold bg-transparent border-none focus:ring-0 outline-none appearance-none cursor-pointer"
                >
                  {Array.from({ length: 60 }, (_, i) => i).map(m => (
                    <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => handleTimeChange(hours12, minutes, 'AM')}
                  className={`px-4 py-2 rounded-xl font-bold transition-all ${period === 'AM' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'}`}
                >
                  AM
                </button>
                <button 
                  onClick={() => handleTimeChange(hours12, minutes, 'PM')}
                  className={`px-4 py-2 rounded-xl font-bold transition-all ${period === 'PM' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'}`}
                >
                  PM
                </button>
              </div>
            </div>
            <p className="text-xs text-zinc-400 font-medium">24h format: {time}</p>
          </div>

          {/* Label */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Label</label>
            <input 
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Morning Wakeup"
              className="w-full bg-zinc-50 rounded-xl p-3 border-none focus:ring-1 focus:ring-zinc-200 outline-none"
            />
          </div>

          {/* Days */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Repeat</label>
            <div className="flex justify-between">
              {DAYS_OF_WEEK.map((day, i) => (
                <button
                  key={day}
                  onClick={() => toggleDay(i)}
                  className={`w-10 h-10 rounded-full text-xs font-medium transition-colors ${
                    days.includes(i) ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  }`}
                >
                  {day[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Challenge Type */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Challenge</label>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant={challengeType === 'random' ? 'primary' : 'outline'}
                onClick={() => setChallengeType('random')}
                className="justify-start gap-2"
              >
                <Settings2 className="w-4 h-4" />
                Random
              </Button>
              {CHALLENGES.map(c => (
                <Button 
                  key={c.type}
                  variant={challengeType === c.type ? 'primary' : 'outline'}
                  onClick={() => setChallengeType(c.type)}
                  className="justify-start gap-2"
                >
                  <Clock className="w-4 h-4" />
                  {c.label.split(' ')[0]}
                </Button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Difficulty</label>
            <div className="flex gap-2">
              {DIFFICULTIES.map(d => (
                <Button 
                  key={d}
                  variant={difficulty === d ? 'primary' : 'outline'}
                  onClick={() => setDifficulty(d)}
                  className="flex-1 capitalize"
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>

        <CardFooter className="gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} className="flex-1">Save Alarm</Button>
        </CardFooter>
      </Card>
    </div>
  );
};
