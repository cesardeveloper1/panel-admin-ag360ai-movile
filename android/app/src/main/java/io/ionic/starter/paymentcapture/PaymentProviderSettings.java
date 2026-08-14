package io.ionic.starter.paymentcapture;

import android.content.Context;
import android.content.SharedPreferences;

final class PaymentProviderSettings {
    static final String YAPE = "yape";
    static final String PLIN = "plin";

    private static final String PREFERENCES = "payment_provider_settings_v1";
    private static final String ENABLED_PREFIX = "enabled_";

    private final SharedPreferences preferences;

    PaymentProviderSettings(Context context) {
        preferences = context.getApplicationContext()
            .getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }

    boolean isEnabled(String provider) {
        if (YAPE.equals(provider)) {
            return preferences.getBoolean(ENABLED_PREFIX + provider, true);
        }
        if (PLIN.equals(provider)) {
            return preferences.getBoolean(ENABLED_PREFIX + provider, false);
        }
        return false;
    }

    boolean isSupported(String provider) {
        return YAPE.equals(provider);
    }

    boolean isKnown(String provider) {
        return YAPE.equals(provider) || PLIN.equals(provider);
    }

    boolean setEnabled(String provider, boolean enabled) {
        if (!isKnown(provider)) {
            throw new IllegalArgumentException("PAYMENT_PROVIDER_UNKNOWN");
        }
        if (enabled && !isSupported(provider)) {
            throw new IllegalStateException("PAYMENT_PROVIDER_NOT_SUPPORTED");
        }
        return preferences.edit().putBoolean(ENABLED_PREFIX + provider, enabled).commit();
    }
}
