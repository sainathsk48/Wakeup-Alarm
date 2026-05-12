package com.wakeupalarm.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;
import androidx.core.app.NotificationCompat;

public class AlarmSoundService extends Service {
    private static final String TAG = "AlarmSoundService";
    private static final String CHANNEL_ID = "alarm_ringing_channel_v1";
    private static final int NOTIFICATION_ID = 9999;

    private MediaPlayer mediaPlayer;
    private Ringtone ringtone;
    private Vibrator vibrator;
    private PowerManager.WakeLock wakeLock;
    private AudioFocusRequest audioFocusRequest;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private String currentAlarmId;
    private String currentAlarmLabel = "Wakeup Alarm";

    private final Runnable signalGuard = new Runnable() {
        @Override
        public void run() {
            prepareAudioEnvironment();
            if (mediaPlayer != null && !mediaPlayer.isPlaying()) {
                try {
                    mediaPlayer.start();
                } catch (Exception e) {
                    Log.w(TAG, "Unable to restart MediaPlayer", e);
                }
            }
            handler.postDelayed(this, 2000L);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        acquireWakeLock();
        startForegroundNotification();
        prepareAudioEnvironment();
        startAlarmSignals();
        handler.post(signalGuard);
        Log.d(TAG, "Alarm service created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String alarmId = intent == null ? null : intent.getStringExtra(AlarmScheduler.EXTRA_ALARM_ID);
        String label = intent == null ? null : intent.getStringExtra(AlarmScheduler.EXTRA_ALARM_LABEL);

        if (alarmId == null || alarmId.isEmpty()) {
            alarmId = AlarmScheduler.getRingingAlarmId(this);
        }
        if (label == null || label.isEmpty()) {
            label = AlarmScheduler.getRingingAlarmLabel(this);
        }

        currentAlarmId = alarmId == null ? "current" : alarmId;
        currentAlarmLabel = label == null || label.isEmpty() ? "Wakeup Alarm" : label;
        AlarmScheduler.markRinging(this, currentAlarmId, currentAlarmLabel);

        startForegroundNotification();
        launchAppUI();
        startAlarmSignals();
        return START_STICKY;
    }

    private void acquireWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            return;
        }

        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager == null) {
            return;
        }

        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "WakeupAlarm::RingingWakeLock");
        wakeLock.setReferenceCounted(false);
        wakeLock.acquire();
    }

    private void prepareAudioEnvironment() {
        AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (audioManager == null) {
            return;
        }

        try {
            AudioAttributes alarmAttributes = buildAlarmAudioAttributes();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                        .setAudioAttributes(alarmAttributes)
                        .setWillPauseWhenDucked(false)
                        .build();
                audioManager.requestAudioFocus(audioFocusRequest);
            } else {
                audioManager.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN);
            }

            int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0);
        } catch (Exception e) {
            Log.w(TAG, "Unable to force alarm audio settings", e);
        }
    }

    private void startAlarmSignals() {
        startVibration();

        if (mediaPlayer != null && mediaPlayer.isPlaying()) {
            return;
        }

        if (startBundledAlarmSound()) {
            return;
        }

        if (startSystemAlarmSound()) {
            return;
        }

        startRingtoneFallback();
    }

    private void startVibration() {
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator == null) {
            return;
        }

        long[] pattern = {0L, 700L, 300L, 700L, 600L};
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
            } else {
                vibrator.vibrate(pattern, 0);
            }
        } catch (Exception e) {
            Log.w(TAG, "Unable to start vibration", e);
        }
    }

    private boolean startBundledAlarmSound() {
        try {
            AssetFileDescriptor descriptor = getResources().openRawResourceFd(R.raw.alarm);
            if (descriptor == null) {
                return false;
            }

            MediaPlayer player = buildMediaPlayer();
            player.setDataSource(descriptor.getFileDescriptor(), descriptor.getStartOffset(), descriptor.getLength());
            descriptor.close();
            player.prepare();
            player.start();
            replaceMediaPlayer(player);
            Log.d(TAG, "Playing bundled alarm.wav");
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Bundled alarm sound failed", e);
            return false;
        }
    }

    private boolean startSystemAlarmSound() {
        try {
            Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmUri == null) {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            }
            if (alarmUri == null) {
                return false;
            }

            MediaPlayer player = buildMediaPlayer();
            player.setDataSource(this, alarmUri);
            player.prepare();
            player.start();
            replaceMediaPlayer(player);
            Log.d(TAG, "Playing system alarm sound");
            return true;
        } catch (Exception e) {
            Log.e(TAG, "System alarm sound failed", e);
            return false;
        }
    }

    private void startRingtoneFallback() {
        try {
            Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmUri == null) {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            }

            ringtone = RingtoneManager.getRingtone(this, alarmUri);
            if (ringtone == null) {
                return;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                ringtone.setAudioAttributes(buildAlarmAudioAttributes());
            } else {
                ringtone.setStreamType(AudioManager.STREAM_ALARM);
            }
            ringtone.play();
            Log.d(TAG, "Playing ringtone fallback");
        } catch (Exception e) {
            Log.e(TAG, "Ringtone fallback failed", e);
        }
    }

    private MediaPlayer buildMediaPlayer() {
        MediaPlayer player = new MediaPlayer();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            player.setAudioAttributes(buildAlarmAudioAttributes());
        } else {
            player.setAudioStreamType(AudioManager.STREAM_ALARM);
        }
        player.setLooping(true);
        player.setVolume(1.0f, 1.0f);
        player.setOnErrorListener((mp, what, extra) -> {
            Log.e(TAG, "MediaPlayer error what=" + what + " extra=" + extra);
            return true;
        });
        return player;
    }

    private AudioAttributes buildAlarmAudioAttributes() {
        return new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
    }

    private void replaceMediaPlayer(MediaPlayer player) {
        if (mediaPlayer != null && mediaPlayer != player) {
            try {
                mediaPlayer.stop();
            } catch (Exception ignored) {}
            mediaPlayer.release();
        }
        mediaPlayer = player;
    }

    private void startForegroundNotification() {
        createNotificationChannel();

        Intent launchIntent = AlarmScheduler.buildAlarmActivityIntent(this, currentAlarmId, currentAlarmLabel);
        PendingIntent launchPendingIntent = PendingIntent.getActivity(
                this,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag()
        );

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Alarm ringing")
                .setContentText("Solve the puzzle to stop the sound")
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(false)
                .setOnlyAlertOnce(false)
                .setSound(null)
                .setContentIntent(launchPendingIntent)
                .setFullScreenIntent(launchPendingIntent, true)
                .build();

        startForeground(NOTIFICATION_ID, notification);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Ringing alarms",
                NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Shows active alarms that require a puzzle to stop");
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[]{0L, 700L, 300L, 700L});
        channel.setSound(null, null);

        NotificationManager notificationManager = getSystemService(NotificationManager.class);
        if (notificationManager != null) {
            notificationManager.createNotificationChannel(channel);
        }
    }

    private void launchAppUI() {
        try {
            startActivity(AlarmScheduler.buildAlarmActivityIntent(this, currentAlarmId, currentAlarmLabel));
        } catch (Exception e) {
            Log.w(TAG, "Direct activity launch blocked; full-screen notification remains available", e);
        }
    }

    private int immutableFlag() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);

        if (mediaPlayer != null) {
            try {
                mediaPlayer.stop();
            } catch (Exception ignored) {}
            mediaPlayer.release();
            mediaPlayer = null;
        }

        if (ringtone != null && ringtone.isPlaying()) {
            ringtone.stop();
        }

        if (vibrator != null) {
            vibrator.cancel();
        }

        AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (audioManager != null) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                    audioManager.abandonAudioFocusRequest(audioFocusRequest);
                } else {
                    audioManager.abandonAudioFocus(null);
                }
            } catch (Exception ignored) {}
        }

        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }

        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
