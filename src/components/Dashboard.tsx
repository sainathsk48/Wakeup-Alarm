/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus, Clock, Trash2, ChevronRight, BarChart3 } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Alarm, UserStats } from '../types';
import { DAYS_OF_WEEK } from '../constants';
import { formatTime12h } from '../utils';

interface DashboardProps {
  alarms: Alarm[];
  stats: UserStats;
  onAddAlarm: () => void;
  onEditAlarm: (alarm: Alarm) => void;
  onDeleteAlarm: (id: string) => void;
  onToggleAlarm: (id: string, enabled: boolean) => void;
  onViewStats: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  alarms, 
  stats, 
  onAddAlarm, 
  onEditAlarm, 
  onDeleteAlarm, 
  onToggleAlarm,
  onViewStats
}) => {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wakeup Alarm</h1>
          <p className="text-zinc-500 text-sm">Wake up your brain.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const now = new Date();
            const testTime = new Date(now.getTime() + 5000); // 5 seconds from now
            alert("Test alarm scheduled for 5 seconds from now. Please close the app or lock your screen.");
            // Trigger test via App.tsx callback if provided, or we'll handle it in App.tsx
            (window as any).triggerTestAlarm();
          }} className="rounded-full text-xs font-bold text-red-600 border-red-200">
            TEST ALARM
          </Button>
          <Button variant="outline" size="icon" onClick={onViewStats} className="rounded-full">
            <BarChart3 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-zinc-900 text-white border-none">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-400 uppercase font-semibold">Completed</p>
            <p className="text-2xl font-bold">{stats.alarmsCompleted}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-600 uppercase font-semibold">Streak</p>
            <p className="text-2xl font-bold text-emerald-900">{stats.streak} days</p>
          </CardContent>
        </Card>
      </div>

      {/* Alarm List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Alarms</h2>
          <Button onClick={onAddAlarm} size="sm" className="rounded-full gap-1">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>

        {alarms.length === 0 ? (
          <div className="text-center py-12 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
            <Clock className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <p className="text-zinc-500">No alarms set yet.</p>
            <Button variant="ghost" onClick={onAddAlarm} className="mt-2">Create your first alarm</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {alarms.map(alarm => {
              const { time, period } = formatTime12h(alarm.time);
              return (
                <Card key={alarm.id} className={`transition-all ${alarm.enabled ? 'opacity-100' : 'opacity-60 grayscale'}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => onEditAlarm(alarm)}>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tight">{time}</span>
                        <span className="text-xs font-bold text-zinc-400">{period}</span>
                        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider ml-2">
                          {alarm.label || 'Alarm'}
                        </span>
                      </div>
                      <div className="flex gap-1 mt-1">
                        {DAYS_OF_WEEK.map((day, i) => (
                          <span 
                            key={day} 
                            className={`text-[10px] font-bold ${alarm.days.includes(i) ? 'text-zinc-900' : 'text-zinc-200'}`}
                          >
                            {day[0]}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => onToggleAlarm(alarm.id, !alarm.enabled)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${alarm.enabled ? 'bg-zinc-900' : 'bg-zinc-200'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${alarm.enabled ? 'left-7' : 'left-1'}`} />
                      </button>
                      <Button variant="ghost" size="icon" onClick={() => onDeleteAlarm(alarm.id)} className="text-zinc-300 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
