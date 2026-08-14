package io.ionic.starter;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import io.ionic.starter.paymentcapture.PaymentNotificationCapturePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PaymentNotificationCapturePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
