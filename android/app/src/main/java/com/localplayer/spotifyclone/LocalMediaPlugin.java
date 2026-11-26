package com.localplayer.spotifyclone;

import android.content.Intent;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LocalMedia")
public class LocalMediaPlugin extends Plugin {
    private static LocalMediaPlugin activeInstance;

    @Override
    public void load() {
        activeInstance = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (activeInstance == this) {
            activeInstance = null;
        }
        super.handleOnDestroy();
    }

    public static void emitAction(String action) {
        if (activeInstance != null) {
            JSObject data = new JSObject();
            data.put("action", action);
            activeInstance.notifyListeners("mediaControl", data);
        }
    }

    @PluginMethod
    public void updateState(PluginCall call) {
        String title = call.getString("title", "Offline Player");
        String artist = call.getString("artist", "Local Library");
        String album = call.getString("album", "");
        boolean isPlaying = Boolean.TRUE.equals(call.getBoolean("isPlaying", false));
        long durationMs = call.getInt("durationMs", 0).longValue();
        long positionMs = call.getInt("positionMs", 0).longValue();
        String coverDataUrl = call.getString("coverDataUrl", "");

        Intent intent = new Intent(getContext(), MediaPlaybackService.class);
        intent.setAction(MediaPlaybackService.ACTION_UPDATE);
        intent.putExtra("title", title);
        intent.putExtra("artist", artist);
        intent.putExtra("album", album);
        intent.putExtra("isPlaying", isPlaying);
        intent.putExtra("durationMs", durationMs);
        intent.putExtra("positionMs", positionMs);
        intent.putExtra("coverDataUrl", coverDataUrl);

        if (isPlaying) {
            ContextCompat.startForegroundService(getContext(), intent);
        } else {
            getContext().startService(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        Intent intent = new Intent(getContext(), MediaPlaybackService.class);
        intent.setAction(MediaPlaybackService.ACTION_STOP);
        getContext().startService(intent);
        call.resolve();
    }
}
