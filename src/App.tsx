/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { Dashboard } from './components/Dashboard';
import { AlarmForm } from './components/AlarmForm';
import { AlarmRinging } from './components/AlarmRinging';
import { Stats } from './components/Stats';
import { Login } from './components/Login';
import { Alarm, UserStats } from './types';
import { format } from 'date-fns';
import { auth } from './firebase';
import { 
  signInWithPopup, 
  signInWithCredential,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { dataService } from './services/dataService';
import { notificationService } from './services/notificationService';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { nativeAlarmService } from './services/nativeAlarmService';

// Mock initial data
const INITIAL_STATS: UserStats = {
  userId: 'local-user',
  totalAlarmsSet: 0,
  alarmsCompleted: 0,
  streak: 0,
  lastCompletedDate: null
};

const createFallbackRingingAlarm = (alarmId: string, label?: string): Alarm => ({
  id: alarmId,
  time: format(new Date(), 'HH:mm'),
  days: [0, 1, 2, 3, 4, 5, 6],
  enabled: true,
  label: label || (alarmId === 'test-alarm-id' ? 'TEST ALARM' : 'Wakeup Alarm'),
  difficulty: 'easy',
  challengeType: 'math'
});

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [hasSkippedLogin, setHasSkippedLogin] = useState(false);
  const [view, setView] = useState<'dashboard' | 'stats' | 'form'>('dashboard');
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [stats, setStats] = useState<UserStats>(INITIAL_STATS);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | undefined>();
  const [ringingAlarm, setRingingAlarm] = useState<Alarm | null>(null);
  const [lastTriggeredMinute, setLastTriggeredMinute] = useState<string | null>(null);

  // Auth listener
  useEffect(() => {
    console.log("Initializing Auth Listener...");
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      console.log("Auth State Changed:", u ? "User Logged In" : "No User");
      setUser(u);
      setIsAuthReady(true);
    }, (error) => {
      console.error("Auth Listener Error:", error);
      setIsAuthReady(true); // Still set ready so we don't stay stuck on loader
    });
    
    // Fallback: if auth doesn't respond in 5 seconds, proceed anyway
    const timeout = setTimeout(() => {
      if (!isAuthReady) {
        console.warn("Auth initialization timed out, proceeding...");
        setIsAuthReady(true);
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [isAuthReady]);

  // Sync Alarms
  useEffect(() => {
    if (!isAuthReady) return;
    const unsubscribe = dataService.subscribeToAlarms(user?.uid || null, setAlarms);
    return () => unsubscribe();
  }, [user, isAuthReady]);

  const resolveAlarm = useCallback((alarmId: string, label?: string) => {
    return alarms.find(a => a.id === alarmId) || createFallbackRingingAlarm(alarmId, label);
  }, [alarms]);

  // Initialize notification permissions once. Native scheduling is handled by AlarmPlugin.
  useEffect(() => {
    if (Capacitor.getPlatform() === 'web') return;

    notificationService.init();
  }, []);

  // Bridge native alarm launches/local notification taps into the puzzle screen.
  useEffect(() => {
    if (Capacitor.getPlatform() === 'web') return;

    // Listen for notification actions
    const actionListener = LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      const alarmId = action.notification.extra?.alarmId;
      if (alarmId) {
        setRingingAlarm(resolveAlarm(alarmId));
      }
    });

    // Listen for incoming notifications while app is open
    const receiveListener = LocalNotifications.addListener('localNotificationReceived', (notification) => {
      const alarmId = notification.extra?.alarmId;
      if (alarmId) {
        setRingingAlarm(resolveAlarm(alarmId));
      }
    });

    return () => {
      actionListener.then(l => l.remove());
      receiveListener.then(l => l.remove());
    };
  }, [resolveAlarm]);

  // When Android wakes the app from the native alarm service, React may start after the broadcast.
  // Poll the native ringing state so the puzzle appears even if no Capacitor notification event fires.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    const syncNativeRingingAlarm = async () => {
      const state = await nativeAlarmService.getRingingAlarm();
      if (!cancelled && state.ringing && state.alarmId) {
        setRingingAlarm(resolveAlarm(state.alarmId, state.label));
      }
    };

    syncNativeRingingAlarm();
    const interval = window.setInterval(syncNativeRingingAlarm, 2000);
    window.addEventListener('focus', syncNativeRingingAlarm);
    document.addEventListener('visibilitychange', syncNativeRingingAlarm);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', syncNativeRingingAlarm);
      document.removeEventListener('visibilitychange', syncNativeRingingAlarm);
    };
  }, [resolveAlarm]);

  // Sync notifications when alarms change
  useEffect(() => {
    if (isAuthReady) {
      notificationService.scheduleAlarms(alarms);
    }
  }, [alarms, isAuthReady]);

  // Alarm checking logic
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = format(now, 'HH:mm');
      const currentDay = now.getDay();

      if (currentTime === lastTriggeredMinute) return;

      const activeAlarm = alarms.find(a => 
        a.enabled && 
        a.time === currentTime && 
        a.days.includes(currentDay)
      );

      if (activeAlarm) {
        setRingingAlarm(activeAlarm);
        setLastTriggeredMinute(currentTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [alarms, lastTriggeredMinute]);

  // Login removed as requested
  useEffect(() => {
    (window as any).triggerTestAlarm = async () => {
      const testAlarm: Alarm = {
        id: 'test-alarm-id',
        time: format(new Date(Date.now() + 5000), 'HH:mm'),
        days: [0, 1, 2, 3, 4, 5, 6],
        enabled: true,
        label: 'TEST ALARM',
        difficulty: 'easy',
        challengeType: 'math'
      };
      
      if (Capacitor.isNativePlatform()) {
        await nativeAlarmService.scheduleAt('test-alarm-id', Date.now() + 5000, 'TEST ALARM');
      } else {
        setTimeout(() => {
          setRingingAlarm(testAlarm);
        }, 5000);
      }
    };
  }, []);

  const handleAddAlarm = () => {
    setEditingAlarm(undefined);
    setView('form');
  };

  const handleEditAlarm = (alarm: Alarm) => {
    setEditingAlarm(alarm);
    setView('form');
  };

  const handleSaveAlarm = async (alarmData: Partial<Alarm>) => {
    try {
      const alarmId = editingAlarm?.id || Math.random().toString(36).substr(2, 9);
      
      if (editingAlarm) {
        await dataService.updateAlarm(user?.uid || null, alarmId, alarmData);
      } else {
        await dataService.addAlarm(user?.uid || null, alarmData);
        await dataService.updateStats(user?.uid || null, {
          ...stats,
          userId: user?.uid || 'local-user',
          totalAlarmsSet: stats.totalAlarmsSet + 1
        });
      }
      
      setView('dashboard');
    } catch (error) {
      console.error("Save Alarm Error:", error);
      alert("Failed to save alarm. Please check your connection or try again.");
    }
  };

  const handleDeleteAlarm = async (id: string) => {
    await dataService.deleteAlarm(user?.uid || null, id);
  };

  const handleToggleAlarm = async (id: string, enabled: boolean) => {
    await dataService.updateAlarm(user?.uid || null, id, { enabled });
  };

  const handleAlarmComplete = useCallback(async () => {
    if (!ringingAlarm) return;
    await nativeAlarmService.stopService();

    const today = format(new Date(), 'yyyy-MM-dd');
    const isNewDay = stats.lastCompletedDate !== today;
    
    const updatedStats = {
      ...stats,
      userId: user?.uid || 'local-user',
      alarmsCompleted: stats.alarmsCompleted + 1,
      streak: isNewDay ? stats.streak + 1 : stats.streak,
      lastCompletedDate: today,
    };

    await dataService.updateStats(user?.uid || null, updatedStats);
    setRingingAlarm(null);
  }, [ringingAlarm, user, stats]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  // No login required anymore
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      <AnimatePresence mode="wait">
        {view === 'dashboard' && (
          <Dashboard 
            key="dashboard"
            alarms={alarms}
            stats={stats}
            onAddAlarm={handleAddAlarm}
            onEditAlarm={handleEditAlarm}
            onDeleteAlarm={handleDeleteAlarm}
            onToggleAlarm={handleToggleAlarm}
            onViewStats={() => setView('stats')}
          />
        )}
        {view === 'stats' && (
          <Stats 
            key="stats"
            stats={stats}
            onBack={() => setView('dashboard')}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {view === 'form' && (
          <AlarmForm 
            key="form"
            alarm={editingAlarm}
            onSave={handleSaveAlarm}
            onCancel={() => setView('dashboard')}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ringingAlarm && (
          <AlarmRinging 
            key="ringing"
            alarm={ringingAlarm}
            onComplete={handleAlarmComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
