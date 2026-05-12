/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Alarm } from '../types';
import { addDays, set, isBefore } from 'date-fns';
import { nativeAlarmService } from './nativeAlarmService';

export const notificationService = {
  async init() {
    if (Capacitor.getPlatform() === 'web') return;

    try {
      await LocalNotifications.requestPermissions();
      if (Capacitor.getPlatform() === 'android') {
        await nativeAlarmService.ensurePermissions();
        await LocalNotifications.createChannel({
          id: 'alarms',
          name: 'Alarms',
          description: 'Critical alarms',
          importance: 5,
          visibility: 1,
          sound: 'alarm.wav',
          vibration: true,
        });
      }
    } catch (error) {
      console.error('Notification init error:', error);
    }
  },

  async scheduleAlarms(alarms: Alarm[]) {
    if (Capacitor.getPlatform() === 'web') return;

    try {
      // 1. Cancel all existing local notifications
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
      await nativeAlarmService.cancelAllScheduled();

      const notifications = [];

      for (const alarm of alarms) {
        if (!alarm.enabled) continue;

        const [hours, minutes] = alarm.time.split(':').map(Number);
        
        // BUG 2 FIX: Pass hour and minute directly to native layer
        // We calculate the next occurrence for the JS-side visual notification
        for (const day of alarm.days) {
          let scheduleDate = set(new Date(), {
            hours,
            minutes,
            seconds: 0,
            milliseconds: 0
          });

          const today = new Date().getDay();
          let daysToAdd = (day - today + 7) % 7;
          
          if (daysToAdd === 0 && isBefore(scheduleDate, new Date())) {
            daysToAdd = 7;
          }
          
          scheduleDate = addDays(scheduleDate, daysToAdd);

          const notificationId = Math.abs(parseInt(alarm.id.substring(0, 8), 36) + day);

          notifications.push({
            title: 'Wakeup Alarm!',
            body: alarm.label || 'Time to wake up!',
            id: notificationId,
            schedule: { at: scheduleDate, repeats: true, every: 'week' },
            sound: 'alarm.wav',
            channelId: 'alarms',
            extra: { alarmId: alarm.id },
            ongoing: true,
            priority: 2,
            visibility: 1,
          });
        }

        await nativeAlarmService.schedule(alarm, hours, minutes);
      }

      if (notifications.length > 0 && Capacitor.getPlatform() !== 'android') {
        await LocalNotifications.schedule({ notifications });
      }
    } catch (error) {
      console.error('Notification schedule error:', error);
    }
  },

  async cancelAll() {
    if (Capacitor.getPlatform() === 'web') return;
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel(pending);
      }
      await nativeAlarmService.stopService();
    } catch (error) {
      console.error('Notification cancel error:', error);
    }
  }
};
