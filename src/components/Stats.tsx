/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, Trophy, Target, Zap } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { UserStats } from '../types';

interface StatsProps {
  stats: UserStats;
  onBack: () => void;
}

export const Stats: React.FC<StatsProps> = ({ stats, onBack }) => {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">Your Progress</h1>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 text-white border-none">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-yellow-400" />
            </div>
            <h2 className="text-3xl font-bold mb-1">{stats.alarmsCompleted}</h2>
            <p className="text-zinc-400 text-sm uppercase tracking-widest">Total Alarms Solved</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                <Zap className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold">{stats.streak}</h3>
              <p className="text-zinc-500 text-xs uppercase tracking-wider">Day Streak</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold">{stats.totalAlarmsSet}</h3>
              <p className="text-zinc-500 text-xs uppercase tracking-wider">Total Created</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Achievements</h3>
        <div className="space-y-3">
          {[
            { label: 'Early Bird', desc: 'Complete 5 alarms before 7 AM', progress: 60, icon: '🌅' },
            { label: 'Math Whiz', desc: 'Solve 10 math puzzles', progress: 40, icon: '🔢' },
            { label: 'Unstoppable', desc: 'Reach a 7-day streak', progress: 20, icon: '🔥' },
          ].map(ach => (
            <Card key={ach.label}>
              <CardContent className="p-4 flex items-center gap-4">
                <span className="text-2xl">{ach.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="font-medium">{ach.label}</h4>
                    <span className="text-xs text-zinc-400">{ach.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-900" style={{ width: `${ach.progress}%` }} />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">{ach.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
