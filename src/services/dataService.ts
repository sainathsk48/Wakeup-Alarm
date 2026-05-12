/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Alarm, UserStats } from '../types';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';

const LOCAL_STORAGE_KEY = 'reverse_alarm_data';

interface LocalData {
  alarms: Alarm[];
  stats: UserStats;
}

const getLocalData = (): LocalData => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (data) return JSON.parse(data);
  return {
    alarms: [],
    stats: {
      userId: 'local-user',
      totalAlarmsSet: 0,
      alarmsCompleted: 0,
      streak: 0,
      lastCompletedDate: null
    }
  };
};

const saveLocalData = (data: LocalData) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  // Trigger local listeners
  window.dispatchEvent(new Event('local-data-updated'));
};

export const dataService = {
  // Listen to Alarms
  subscribeToAlarms: (userId: string | null, callback: (alarms: Alarm[]) => void) => {
    if (userId && db) {
      const q = query(collection(db, 'alarms'), where('userId', '==', userId));
      return onSnapshot(q, (snapshot) => {
        const alarms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alarm));
        callback(alarms);
      }, (error) => {
        console.error("Firestore Subscribe Alarms Error:", error);
      });
    } else {
      // Local mode
      const handler = () => {
        callback(getLocalData().alarms);
      };
      window.addEventListener('local-data-updated', handler);
      handler(); // Initial call
      return () => window.removeEventListener('local-data-updated', handler);
    }
  },

  // Listen to Stats
  subscribeToStats: (userId: string | null, callback: (stats: UserStats) => void) => {
    if (userId && db) {
      const docRef = doc(db, 'stats', userId);
      return onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
          callback(doc.data() as UserStats);
        }
      }, (error) => {
        console.error("Firestore Subscribe Stats Error:", error);
      });
    } else {
      // Local mode
      const handler = () => {
        callback(getLocalData().stats);
      };
      window.addEventListener('local-data-updated', handler);
      handler(); // Initial call
      return () => window.removeEventListener('local-data-updated', handler);
    }
  },

  // Add Alarm
  addAlarm: async (userId: string | null, alarm: Partial<Alarm>) => {
    const alarmId = alarm.id || Math.random().toString(36).substr(2, 9);
    if (userId && db) {
      await setDoc(doc(db, 'alarms', alarmId), { ...alarm, id: alarmId, userId });
    } else {
      const data = getLocalData();
      const newAlarm = { ...alarm, id: alarmId, userId: 'local' } as Alarm;
      data.alarms.push(newAlarm);
      saveLocalData(data);
    }
  },

  // Update Alarm
  updateAlarm: async (userId: string | null, alarmId: string, updates: Partial<Alarm>) => {
    if (userId && db) {
      // Ensure ID and userId are preserved
      await updateDoc(doc(db, 'alarms', alarmId), { ...updates, id: alarmId, userId });
    } else {
      const data = getLocalData();
      data.alarms = data.alarms.map(a => a.id === alarmId ? { ...a, ...updates } : a);
      saveLocalData(data);
    }
  },

  // Delete Alarm
  deleteAlarm: async (userId: string | null, alarmId: string) => {
    if (userId && db) {
      await deleteDoc(doc(db, 'alarms', alarmId));
    } else {
      const data = getLocalData();
      data.alarms = data.alarms.filter(a => a.id !== alarmId);
      saveLocalData(data);
    }
  },

  // Update Stats
  updateStats: async (userId: string | null, stats: UserStats) => {
    if (userId && db) {
      await setDoc(doc(db, 'stats', userId), stats);
    } else {
      const data = getLocalData();
      data.stats = stats;
      saveLocalData(data);
    }
  }
};
