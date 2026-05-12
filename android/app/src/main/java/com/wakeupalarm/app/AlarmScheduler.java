package com.wakeupalarm.app;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;
import java.util.Calendar;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

final class AlarmScheduler {
    static final String ACTION_ALARM_TRIGGER = "com.wakeupalarm.app.ALARM_TRIGGER";
    static final String EXTRA_ALARM_ID = "alarmId";
    static final String EXTRA_ALARM_LABEL = "alarmLabel";
    static final String EXTRA_ALARM_DAY = "alarmDay";
    static final String EXTRA_ONE_SHOT = "oneShot";

    private static final String TAG = "AlarmScheduler";
    private static final String PREFS = "alarms";
    private static final String KEY_RINGING_ALARM_ID = "ringing_alarm_id";
    private static final String KEY_RINGING_ALARM_LABEL = "ringing_alarm_label";
    private static final String KEY_RINGING_SINCE = "ringing_since";
    private static final int ONE_SHOT_DAY = -1;
    private static final int TEST_DAY = -2;

    private AlarmScheduler() {}

    static boolean canScheduleExactAlarms(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return true;
        }

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        return alarmManager != null && alarmManager.canScheduleExactAlarms();
    }

    static boolean canUseFullScreenIntent(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            return true;
        }

        NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
        return notificationManager != null && notificationManager.canUseFullScreenIntent();
    }

    static void openExactAlarmSettings(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return;
        }

        Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
        intent.setData(Uri.parse("package:" + context.getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }

    static void openFullScreenIntentSettings(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            return;
        }

        Intent intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
        intent.setData(Uri.parse("package:" + context.getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }

    static void scheduleRepeatingAlarm(Context context, String id, int hour, int minute, int[] days, String label) {
        cancelScheduledAlarm(context, id);
        saveAlarmConfig(context, id, hour, minute, days, label);

        if (days.length == 0) {
            scheduleSingle(context, id, hour, minute, ONE_SHOT_DAY, label, false);
            return;
        }

        for (int day : days) {
            if (day >= 0 && day <= 6) {
                scheduleSingle(context, id, hour, minute, day, label, false);
            }
        }
    }

    static void scheduleOneShotAt(Context context, String id, long triggerAtMillis, String label) {
        cancelOneShot(context, id, TEST_DAY);
        saveOneShotConfig(context, id, triggerAtMillis, label);

        PendingIntent operation = buildAlarmOperation(context, id, TEST_DAY, label, true);
        PendingIntent showIntent = buildShowIntent(context, id, TEST_DAY, label);
        setAlarmClock(context, triggerAtMillis, operation, showIntent);
        Log.d(TAG, "Scheduled one-shot alarm [" + id + "] for " + triggerAtMillis);
    }

    static void cancelScheduledAlarm(Context context, String id) {
        for (int day = 0; day <= 6; day++) {
            cancelOneShot(context, id, day);
        }
        cancelOneShot(context, id, ONE_SHOT_DAY);
        cancelOneShot(context, id, TEST_DAY);
        removeAlarmConfig(context, id);
    }

    static void cancelAllScheduledAlarms(Context context) {
        SharedPreferences prefs = prefs(context);
        Set<String> alarmIds = new HashSet<>();

        for (String key : prefs.getAll().keySet()) {
            if (key.startsWith("hour_")) {
                alarmIds.add(key.substring(5));
            } else if (key.startsWith("oneshot_")) {
                alarmIds.add(key.substring(8));
            }
        }

        for (String id : alarmIds) {
            cancelScheduledAlarm(context, id);
        }
    }

    static void rescheduleAfterTrigger(Context context, String id, int triggeredDay, boolean oneShot) {
        if (oneShot || triggeredDay < 0) {
            removeAlarmConfig(context, id);
            return;
        }

        SharedPreferences prefs = prefs(context);
        int hour = prefs.getInt("hour_" + id, -1);
        int minute = prefs.getInt("minute_" + id, -1);
        String label = prefs.getString("label_" + id, "Wakeup Alarm");

        if (hour < 0 || minute < 0) {
            return;
        }

        scheduleSingle(context, id, hour, minute, triggeredDay, label, true);
    }

    static void rescheduleAllAlarms(Context context) {
        SharedPreferences prefs = prefs(context);
        Map<String, ?> allEntries = prefs.getAll();
        Set<String> alarmIds = new HashSet<>();

        for (String key : allEntries.keySet()) {
            if (key.startsWith("hour_")) {
                alarmIds.add(key.substring(5));
            }
        }

        for (String id : alarmIds) {
            int hour = prefs.getInt("hour_" + id, -1);
            int minute = prefs.getInt("minute_" + id, -1);
            String label = prefs.getString("label_" + id, "Wakeup Alarm");
            int[] days = parseDays(prefs.getString("days_" + id, ""));

            if (hour >= 0 && minute >= 0) {
                scheduleRepeatingAlarm(context, id, hour, minute, days, label);
                Log.d(TAG, "Restored alarm [" + id + "]");
            }
        }

        for (String key : allEntries.keySet()) {
            if (!key.startsWith("oneshot_")) {
                continue;
            }

            String id = key.substring(8);
            long triggerAtMillis = prefs.getLong(key, 0L);
            String label = prefs.getString("label_" + id, "Wakeup Alarm");
            if (triggerAtMillis > System.currentTimeMillis()) {
                scheduleOneShotAt(context, id, triggerAtMillis, label);
            } else {
                removeAlarmConfig(context, id);
            }
        }
    }

    static Intent buildAlarmActivityIntent(Context context, String alarmId, String label) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra(EXTRA_ALARM_ID, alarmId);
        intent.putExtra(EXTRA_ALARM_LABEL, label);
        intent.putExtra("openAlarmPuzzle", true);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return intent;
    }

    static void markRinging(Context context, String alarmId, String label) {
        prefs(context).edit()
                .putString(KEY_RINGING_ALARM_ID, alarmId == null ? "" : alarmId)
                .putString(KEY_RINGING_ALARM_LABEL, label == null ? "Wakeup Alarm" : label)
                .putLong(KEY_RINGING_SINCE, System.currentTimeMillis())
                .apply();
    }

    static void clearRinging(Context context) {
        prefs(context).edit()
                .remove(KEY_RINGING_ALARM_ID)
                .remove(KEY_RINGING_ALARM_LABEL)
                .remove(KEY_RINGING_SINCE)
                .apply();
    }

    static String getRingingAlarmId(Context context) {
        String alarmId = prefs(context).getString(KEY_RINGING_ALARM_ID, null);
        return alarmId == null || alarmId.isEmpty() ? null : alarmId;
    }

    static String getRingingAlarmLabel(Context context) {
        return prefs(context).getString(KEY_RINGING_ALARM_LABEL, "Wakeup Alarm");
    }

    static long getRingingSince(Context context) {
        return prefs(context).getLong(KEY_RINGING_SINCE, 0L);
    }

    private static void saveAlarmConfig(Context context, String id, int hour, int minute, int[] days, String label) {
        prefs(context).edit()
                .putInt("hour_" + id, hour)
                .putInt("minute_" + id, minute)
                .putString("days_" + id, joinDays(days))
                .putString("label_" + id, label == null ? "Wakeup Alarm" : label)
                .apply();
    }

    private static void saveOneShotConfig(Context context, String id, long triggerAtMillis, String label) {
        prefs(context).edit()
                .putLong("oneshot_" + id, triggerAtMillis)
                .putString("label_" + id, label == null ? "Wakeup Alarm" : label)
                .apply();
    }

    private static void removeAlarmConfig(Context context, String id) {
        prefs(context).edit()
                .remove("alarm_" + id)
                .remove("hour_" + id)
                .remove("minute_" + id)
                .remove("days_" + id)
                .remove("label_" + id)
                .remove("oneshot_" + id)
                .apply();
    }

    private static void scheduleSingle(Context context, String id, int hour, int minute, int day, String label, boolean forceNextWeek) {
        long triggerTime = nextTriggerMillis(hour, minute, day, forceNextWeek);
        PendingIntent operation = buildAlarmOperation(context, id, day, label, false);
        PendingIntent showIntent = buildShowIntent(context, id, day, label);
        setAlarmClock(context, triggerTime, operation, showIntent);
        Log.d(TAG, "Scheduled alarm [" + id + "] day=" + day + " for " + triggerTime);
    }

    private static void setAlarmClock(Context context, long triggerAtMillis, PendingIntent operation, PendingIntent showIntent) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            throw new IllegalStateException("AlarmManager unavailable");
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            AlarmManager.AlarmClockInfo alarmInfo = new AlarmManager.AlarmClockInfo(triggerAtMillis, showIntent);
            alarmManager.setAlarmClock(alarmInfo, operation);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, operation);
        } else {
            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, operation);
        }
    }

    private static PendingIntent buildAlarmOperation(Context context, String id, int day, String label, boolean oneShot) {
        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.setAction(ACTION_ALARM_TRIGGER);
        intent.putExtra(EXTRA_ALARM_ID, id);
        intent.putExtra(EXTRA_ALARM_DAY, day);
        intent.putExtra(EXTRA_ALARM_LABEL, label == null ? "Wakeup Alarm" : label);
        intent.putExtra(EXTRA_ONE_SHOT, oneShot || day == TEST_DAY || day == ONE_SHOT_DAY);

        return PendingIntent.getBroadcast(
                context,
                requestCode(id, day),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag()
        );
    }

    private static PendingIntent buildShowIntent(Context context, String id, int day, String label) {
        return PendingIntent.getActivity(
                context,
                showRequestCode(id, day),
                buildAlarmActivityIntent(context, id, label),
                PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag()
        );
    }

    private static void cancelOneShot(Context context, String id, int day) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            return;
        }

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode(id, day),
                new Intent(context, AlarmReceiver.class).setAction(ACTION_ALARM_TRIGGER),
                PendingIntent.FLAG_NO_CREATE | immutableFlag()
        );

        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
        }
    }

    private static long nextTriggerMillis(int hour, int minute, int day, boolean forceNextWeek) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(System.currentTimeMillis());
        calendar.set(Calendar.HOUR_OF_DAY, hour);
        calendar.set(Calendar.MINUTE, minute);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);

        if (day >= 0) {
            calendar.set(Calendar.DAY_OF_WEEK, day + 1);
        }

        if (forceNextWeek) {
            calendar.add(Calendar.DAY_OF_MONTH, day >= 0 ? 7 : 1);
        } else {
            while (calendar.getTimeInMillis() <= System.currentTimeMillis()) {
                calendar.add(Calendar.DAY_OF_MONTH, day >= 0 ? 7 : 1);
            }
        }

        return calendar.getTimeInMillis();
    }

    private static int requestCode(String id, int day) {
        return (id + ":alarm:" + day).hashCode();
    }

    private static int showRequestCode(String id, int day) {
        return (id + ":show:" + day).hashCode();
    }

    private static int immutableFlag() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0;
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static String joinDays(int[] days) {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < days.length; i++) {
            if (i > 0) {
                builder.append(',');
            }
            builder.append(days[i]);
        }
        return builder.toString();
    }

    private static int[] parseDays(String value) {
        if (value == null || value.trim().isEmpty()) {
            return new int[0];
        }

        String[] parts = value.split(",");
        int[] days = new int[parts.length];
        int count = 0;
        for (String part : parts) {
            try {
                int day = Integer.parseInt(part.trim());
                if (day >= 0 && day <= 6) {
                    days[count++] = day;
                }
            } catch (NumberFormatException ignored) {}
        }

        if (count == days.length) {
            return days;
        }

        int[] compact = new int[count];
        System.arraycopy(days, 0, compact, 0, count);
        return compact;
    }
}
