package com.wakeupalarm.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AlarmReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        Log.d(TAG, "onReceive action=" + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            AlarmScheduler.rescheduleAllAlarms(context);
            return;
        }

        if (!AlarmScheduler.ACTION_ALARM_TRIGGER.equals(action)) {
            return;
        }

        String alarmId = intent.getStringExtra(AlarmScheduler.EXTRA_ALARM_ID);
        String label = intent.getStringExtra(AlarmScheduler.EXTRA_ALARM_LABEL);
        int alarmDay = intent.getIntExtra(AlarmScheduler.EXTRA_ALARM_DAY, -1);
        boolean oneShot = intent.getBooleanExtra(AlarmScheduler.EXTRA_ONE_SHOT, false);

        if (alarmId == null || alarmId.isEmpty()) {
            alarmId = "current";
        }
        if (label == null || label.isEmpty()) {
            label = "Wakeup Alarm";
        }

        PowerManager.WakeLock wakeLock = null;
        try {
            PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "WakeupAlarm::ReceiverWakeLock");
                wakeLock.acquire(60000L);
            }

            AlarmScheduler.markRinging(context, alarmId, label);
            AlarmScheduler.rescheduleAfterTrigger(context, alarmId, alarmDay, oneShot);

            Intent serviceIntent = new Intent(context, AlarmSoundService.class);
            serviceIntent.putExtra(AlarmScheduler.EXTRA_ALARM_ID, alarmId);
            serviceIntent.putExtra(AlarmScheduler.EXTRA_ALARM_LABEL, label);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Unable to start alarm service", e);
        } finally {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        }
    }
}
