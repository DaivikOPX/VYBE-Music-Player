package com.localplayer.spotifyclone;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LocalMediaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
