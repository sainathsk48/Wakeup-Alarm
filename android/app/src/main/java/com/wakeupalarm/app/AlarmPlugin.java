package com.wakeupalarm.app;

import android.content.Context;
import android.content.Intent;
import android.util.Log;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AlarmPlugin")
public class AlarmPlugin extends Plugin {
    private static final String TAG = "AlarmPlugin";

    @PluginMethod
    public void setAlarm(PluginCall call) {
        String id = call.getString("id");
        Integer hour = call.getInt("hour");
        Integer minute = call.getInt("minute");
        String label = call.getString("label", "Wakeup Alarm");

        if (id == null || hour == null || minute == null) {
            call.reject("Missing id, hour, or minute");
            return;
        }

        Context context = getContext();
        if (!AlarmScheduler.canScheduleExactAlarms(context)) {
            AlarmScheduler.openExactAlarmSettings(context);
            call.reject("Exact alarm permission is not granted. Enable Alarms & reminders, then save the alarm again.");
            return;
        }

        try {
            AlarmScheduler.scheduleRepeatingAlarm(context, id, hour, minute, parseDays(call.getArray("days")), label);
            Log.d(TAG, "Scheduled alarm [" + id + "] for " + hour + ":" + minute);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule alarm", e);
            call.reject("Failed to schedule alarm: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setAlarmAt(PluginCall call) {
        String id = call.getString("id");
        Long triggerAtMillis = call.getLong("triggerAtMillis");
        String label = call.getString("label", "Wakeup Alarm");

        if (id == null || triggerAtMillis == null) {
            call.reject("Missing id or triggerAtMillis");
            return;
        }

        Context context = getContext();
        if (!AlarmScheduler.canScheduleExactAlarms(context)) {
            AlarmScheduler.openExactAlarmSettings(context);
            call.reject("Exact alarm permission is not granted. Enable Alarms & reminders, then try again.");
            return;
        }

        try {
            AlarmScheduler.scheduleOneShotAt(context, id, triggerAtMillis, label);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule one-shot alarm", e);
            call.reject("Failed to schedule one-shot alarm: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelAlarm(PluginCall call) {
        String id = call.getString("id");
        if (id == null) {
            call.reject("Missing id");
            return;
        }

        Context context = getContext();
        AlarmScheduler.cancelScheduledAlarm(context, id);

        String ringingAlarmId = AlarmScheduler.getRingingAlarmId(context);
        if (id.equals(ringingAlarmId)) {
            stopRingingAlarm(context);
        }

        Log.d(TAG, "Cancelled alarm [" + id + "]");
        call.resolve();
    }

    @PluginMethod
    public void cancelAllAlarms(PluginCall call) {
        AlarmScheduler.cancelAllScheduledAlarms(getContext());
        call.resolve();
    }

    @PluginMethod
    public void stopRinging(PluginCall call) {
        stopRingingAlarm(getContext());
        call.resolve();
    }

    @PluginMethod
    public void getRingingAlarm(PluginCall call) {
        Context context = getContext();
        String alarmId = AlarmScheduler.getRingingAlarmId(context);

        JSObject result = new JSObject();
        result.put("ringing", alarmId != null);
        result.put("alarmId", alarmId == null ? "" : alarmId);
        result.put("label", AlarmScheduler.getRingingAlarmLabel(context));
        result.put("since", AlarmScheduler.getRingingSince(context));
        call.resolve(result);
    }

    @PluginMethod
    public void ensurePermissions(PluginCall call) {
        Context context = getContext();
        boolean canScheduleExactAlarms = AlarmScheduler.canScheduleExactAlarms(context);
        boolean canUseFullScreenIntent = AlarmScheduler.canUseFullScreenIntent(context);

        try {
            if (!canScheduleExactAlarms) {
                AlarmScheduler.openExactAlarmSettings(context);
            } else if (!canUseFullScreenIntent) {
                AlarmScheduler.openFullScreenIntentSettings(context);
            }
        } catch (Exception e) {
            Log.w(TAG, "Unable to open alarm permission settings", e);
        }

        JSObject result = new JSObject();
        result.put("canScheduleExactAlarms", canScheduleExactAlarms);
        result.put("canUseFullScreenIntent", canUseFullScreenIntent);
        call.resolve(result);
    }

    private void stopRingingAlarm(Context context) {
        AlarmScheduler.clearRinging(context);
        context.stopService(new Intent(context, AlarmSoundService.class));
    }

    private int[] parseDays(JSArray array) {
        if (array == null) {
            return new int[0];
        }

        int[] parsed = new int[array.length()];
        int count = 0;
        for (int i = 0; i < array.length(); i++) {
            int day = array.optInt(i, -1);
            if (day >= 0 && day <= 6) {
                parsed[count++] = day;
            }
        }

        if (count == parsed.length) {
            return parsed;
        }

        int[] compact = new int[count];
        System.arraycopy(parsed, 0, compact, 0, count);
        return compact;
    }
}
