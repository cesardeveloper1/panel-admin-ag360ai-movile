package io.ionic.starter;

import android.os.Bundle;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import androidx.appcompat.app.AlertDialog;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.install.model.UpdateAvailability;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;

import com.getcapacitor.BridgeActivity;

import io.ionic.starter.paymentcapture.PaymentNotificationCapturePlugin;
import io.ionic.starter.printing.ThermalPrinterPlugin;

public class MainActivity extends BridgeActivity {
    private boolean updateCheckRunning;
    private AlertDialog updateNotice;

    @Override
    public void onResume() {
        super.onResume();
        if (updateCheckRunning || (updateNotice != null && updateNotice.isShowing())) return;

        updateCheckRunning = true;
        AppUpdateManagerFactory.create(this).getAppUpdateInfo()
            .addOnCompleteListener(task -> {
                updateCheckRunning = false;
                if (!task.isSuccessful() || isFinishing() || isDestroyed()
                    || !getLifecycle().getCurrentState().isAtLeast(androidx.lifecycle.Lifecycle.State.RESUMED)) return;

                var info = task.getResult();
                if (info.updateAvailability() != UpdateAvailability.UPDATE_AVAILABLE) return;

                var preferences = getPreferences(MODE_PRIVATE);
                int availableVersion = info.availableVersionCode();
                if (preferences.getInt("ignored_play_update", -1) == availableVersion) return;

                updateNotice = new AlertDialog.Builder(this)
                    .setTitle(R.string.update_available_title)
                    .setMessage(R.string.update_available_message)
                    .setNegativeButton(R.string.update_ignore, (dialog, which) ->
                        preferences.edit().putInt("ignored_play_update", availableVersion).apply())
                    .setPositiveButton(R.string.update_open_store, (dialog, which) -> openPlayStore())
                    .show();
            });
    }

    private void openPlayStore() {
        String listing = "details?id=" + getPackageName();
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://" + listing)));
        } catch (ActivityNotFoundException error) {
            Intent fallback = new Intent(Intent.ACTION_VIEW,
                Uri.parse("https://play.google.com/store/apps/" + listing));
            try {
                startActivity(fallback);
            } catch (ActivityNotFoundException ignored) {
                // A device without a store or browser can continue using the app.
            }
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PaymentNotificationCapturePlugin.class);
        registerPlugin(ThermalPrinterPlugin.class);
        super.onCreate(savedInstanceState);
        applyDeviceOrientation();
    }

    /** Mantiene vertical los telÃ©fonos; tablets (>= 600dp) pueden rotar libremente. */
    private void applyDeviceOrientation() {
        Configuration configuration = getResources().getConfiguration();
        boolean isTablet = configuration.smallestScreenWidthDp >= 600;
        setRequestedOrientation(isTablet
            ? ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            : ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
    }
}
