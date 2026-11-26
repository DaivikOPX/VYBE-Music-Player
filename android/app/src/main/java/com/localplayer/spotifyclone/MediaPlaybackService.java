package com.localplayer.spotifyclone;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Base64;

import androidx.annotation.Nullable;

public class MediaPlaybackService extends Service {
    public static final String CHANNEL_ID = "local_media_playback";
    public static final int NOTIFICATION_ID = 1001;

    public static final String ACTION_UPDATE = "com.localplayer.spotifyclone.ACTION_UPDATE";
    public static final String ACTION_TOGGLE = "com.localplayer.spotifyclone.ACTION_TOGGLE";
    public static final String ACTION_NEXT = "com.localplayer.spotifyclone.ACTION_NEXT";
    public static final String ACTION_PREV = "com.localplayer.spotifyclone.ACTION_PREV";
    public static final String ACTION_STOP = "com.localplayer.spotifyclone.ACTION_STOP";

    private MediaSession mediaSession;
    private PowerManager.WakeLock wakeLock;

    private String currentTitle = "Offline Player";
    private String currentArtist = "Local Library";
    private String currentAlbum = "";
    private boolean isPlaying = false;
    private long durationMs = 0L;
    private long positionMs = 0L;
    private Bitmap currentArt = null;
    private String lastCoverInput = "";

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();

        mediaSession = new MediaSession(this, "SpotifyLocalSession");
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override
            public void onPlay() {
                LocalMediaPlugin.emitAction("play");
            }

            @Override
            public void onPause() {
                LocalMediaPlugin.emitAction("pause");
            }

            @Override
            public void onSkipToNext() {
                LocalMediaPlugin.emitAction("next");
            }

            @Override
            public void onSkipToPrevious() {
                LocalMediaPlugin.emitAction("prev");
            }

            @Override
            public void onStop() {
                LocalMediaPlugin.emitAction("pause");
                stopSelf();
            }
        });
        mediaSession.setActive(true);

        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SpotifyClone::MediaWakeLock");
            wakeLock.setReferenceCounted(false);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;
        String action = intent.getAction();

        if (ACTION_TOGGLE.equals(action)) {
            LocalMediaPlugin.emitAction("toggle");
            return START_STICKY;
        } else if (ACTION_NEXT.equals(action)) {
            LocalMediaPlugin.emitAction("next");
            return START_STICKY;
        } else if (ACTION_PREV.equals(action)) {
            LocalMediaPlugin.emitAction("prev");
            return START_STICKY;
        } else if (ACTION_STOP.equals(action)) {
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }

        currentTitle = intent.getStringExtra("title");
        if (currentTitle == null || currentTitle.isEmpty()) currentTitle = "Offline Player";
        currentArtist = intent.getStringExtra("artist");
        if (currentArtist == null || currentArtist.isEmpty()) currentArtist = "Local Library";
        currentAlbum = intent.getStringExtra("album");
        if (currentAlbum == null) currentAlbum = "";
        isPlaying = intent.getBooleanExtra("isPlaying", false);
        durationMs = Math.max(0L, intent.getLongExtra("durationMs", 0L));
        positionMs = Math.max(0L, intent.getLongExtra("positionMs", 0L));

        String coverDataUrl = intent.getStringExtra("coverDataUrl");
        if (coverDataUrl != null && !coverDataUrl.equals(lastCoverInput)) {
            lastCoverInput = coverDataUrl;
            currentArt = decodeCoverBitmap(coverDataUrl);
        }

        updateWakeLock();
        updateSession();
        Notification notification = buildNotification();

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception ignored) {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null) nm.notify(NOTIFICATION_ID, notification);
        }

        return START_STICKY;
    }

    private void updateWakeLock() {
        if (wakeLock == null) return;
        try {
            if (isPlaying && !wakeLock.isHeld()) {
                wakeLock.acquire(4 * 60 * 60 * 1000L);
            } else if (!isPlaying && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {
        }
    }

    private void updateSession() {
        MediaMetadata.Builder meta = new MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, currentTitle)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, currentArtist)
            .putString(MediaMetadata.METADATA_KEY_ALBUM, currentAlbum)
            .putLong(MediaMetadata.METADATA_KEY_DURATION, durationMs);
        if (currentArt != null) {
            meta.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, currentArt);
        }
        mediaSession.setMetadata(meta.build());

        long actions = PlaybackState.ACTION_PLAY
            | PlaybackState.ACTION_PAUSE
            | PlaybackState.ACTION_PLAY_PAUSE
            | PlaybackState.ACTION_SKIP_TO_NEXT
            | PlaybackState.ACTION_SKIP_TO_PREVIOUS
            | PlaybackState.ACTION_STOP;

        PlaybackState state = new PlaybackState.Builder()
            .setActions(actions)
            .setState(
                isPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                positionMs,
                isPlaying ? 1.0f : 0.0f
            )
            .build();
        mediaSession.setPlaybackState(state);
    }

    private Notification buildNotification() {
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        PendingIntent prevIntent = serviceActionIntent(ACTION_PREV, 1);
        PendingIntent toggleIntent = serviceActionIntent(ACTION_TOGGLE, 2);
        PendingIntent nextIntent = serviceActionIntent(ACTION_NEXT, 3);

        Notification.Action prevAction = new Notification.Action.Builder(
            android.R.drawable.ic_media_previous,
            "Previous",
            prevIntent
        ).build();

        Notification.Action playPauseAction = new Notification.Action.Builder(
            isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
            isPlaying ? "Pause" : "Play",
            toggleIntent
        ).build();

        Notification.Action nextAction = new Notification.Action.Builder(
            android.R.drawable.ic_media_next,
            "Next",
            nextIntent
        ).build();

        Notification.Builder builder = new Notification.Builder(this, CHANNEL_ID)
            .setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setSubText(currentAlbum)
            .setSmallIcon(getApplicationInfo().icon)
            .setContentIntent(contentIntent)
            .setOngoing(isPlaying)
            .setOnlyAlertOnce(true)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .addAction(prevAction)
            .addAction(playPauseAction)
            .addAction(nextAction)
            .setStyle(
                new Notification.MediaStyle()
                    .setMediaSession(mediaSession.getSessionToken())
                    .setShowActionsInCompactView(0, 1, 2)
            );

        if (currentArt != null) {
            builder.setLargeIcon(currentArt);
        }

        return builder.build();
    }

    private PendingIntent serviceActionIntent(String action, int reqCode) {
        Intent i = new Intent(this, MediaPlaybackService.class);
        i.setAction(action);
        return PendingIntent.getService(
            this,
            reqCode,
            i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private Bitmap decodeCoverBitmap(String dataUrl) {
        try {
            if (dataUrl == null || !dataUrl.startsWith("data:image")) return null;
            int commaIdx = dataUrl.indexOf(',');
            if (commaIdx < 0) return null;
            byte[] bytes = Base64.decode(dataUrl.substring(commaIdx + 1), Base64.DEFAULT);
            return BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        } catch (Exception e) {
            return null;
        }
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Music Playback",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Playback controls for local music");
            channel.setShowBadge(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {
            }
        }
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
