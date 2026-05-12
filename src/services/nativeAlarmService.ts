/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { registerPlugin, Capacitor } from '@capacitor/core';
import { Alarm } from '../types';

export interface AlarmPlugin {
  setAlarm(options: { id: string; hour: number; minute: number; days: number[]; label?: string }): Promise<void>;
  setAlarmAt(options: { id: string; triggerAtMillis: number; label?: string }): Promise<void>;
  cancelAlarm(options: { id: string }): Promise<void>;
  cancelAllAlarms(): Promise<void>;
  stopRinging(): Promise<void>;
  getRingingAlarm(): Promise<{ ringing: boolean; alarmId?: string; label?: string; since?: number }>;
  ensurePermissions(): Promise<{ canScheduleExactAlarms: boolean; canUseFullScreenIntent: boolean }>;
}

const AlarmPlugin = registerPlugin<AlarmPlugin>('AlarmPlugin');

export const nativeAlarmService = {
  async schedule(alarm: Alarm, hour: number, minute: number) {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      await AlarmPlugin.setAlarm({
        id: alarm.id,
        hour,
        minute,
        days: alarm.days || [],
        label: alarm.label || 'Wakeup Alarm'
      });
      console.log(`[NativeAlarm] Scheduled ${alarm.id} for ${hour}:${minute}`);
    } catch (err) {
      console.error('[NativeAlarm] Schedule Error:', err);
    }
  },

  async scheduleAt(id: string, triggerAtMillis: number, label = 'Wakeup Alarm') {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await AlarmPlugin.setAlarmAt({ id, triggerAtMillis, label });
      console.log(`[NativeAlarm] Scheduled ${id} for ${new Date(triggerAtMillis).toISOString()}`);
    } catch (err) {
      console.error('[NativeAlarm] ScheduleAt Error:', err);
    }
  },

  async cancel(alarmId: string) {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      await AlarmPlugin.cancelAlarm({ id: alarmId });
      console.log(`[NativeAlarm] Cancelled ${alarmId}`);
    } catch (err) {
      console.error('[NativeAlarm] Cancel Error:', err);
    }
  },

  async cancelAllScheduled() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await AlarmPlugin.cancelAllAlarms();
      console.log('[NativeAlarm] Cancelled all scheduled native alarms');
    } catch (err) {
      console.error('[NativeAlarm] Cancel All Error:', err);
    }
  },

  async stopService() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await AlarmPlugin.stopRinging();
    } catch (e) {
      console.error('[NativeAlarm] Stop Service Error:', e);
    }
  },

  async getRingingAlarm() {
    if (!Capacitor.isNativePlatform()) return { ringing: false };

    try {
      return await AlarmPlugin.getRingingAlarm();
    } catch (e) {
      console.error('[NativeAlarm] Get Ringing Error:', e);
      return { ringing: false };
    }
  },

  async ensurePermissions() {
    if (!Capacitor.isNativePlatform()) {
      return { canScheduleExactAlarms: true, canUseFullScreenIntent: true };
    }

    try {
      return await AlarmPlugin.ensurePermissions();
    } catch (e) {
      console.error('[NativeAlarm] Permission Check Error:', e);
      return { canScheduleExactAlarms: false, canUseFullScreenIntent: false };
    }
  }
};
