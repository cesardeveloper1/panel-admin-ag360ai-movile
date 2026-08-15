package io.ionic.starter;

import android.os.Bundle;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;

import com.getcapacitor.BridgeActivity;

import io.ionic.starter.paymentcapture.PaymentNotificationCapturePlugin;
import io.ionic.starter.printing.ThermalPrinterPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PaymentNotificationCapturePlugin.class);
        registerPlugin(ThermalPrinterPlugin.class);
        super.onCreate(savedInstanceState);
        applyDeviceOrientation();
    }

    /** Mantiene vertical los teléfonos; tablets (>= 600dp) pueden rotar libremente. */
    private void applyDeviceOrientation() {
        Configuration configuration = getResources().getConfiguration();
        boolean isTablet = configuration.smallestScreenWidthDp >= 600;
        setRequestedOrientation(isTablet
            ? ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            : ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
    }
}
