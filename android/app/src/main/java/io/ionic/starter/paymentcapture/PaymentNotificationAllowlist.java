package io.ionic.starter.paymentcapture;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

final class PaymentNotificationAllowlist {
    // Nunca aceptar paquetes por prefijo o nombre visible.
    private static final Map<String, String> PACKAGES_BY_PROVIDER;

    static {
        Map<String, String> packages = new HashMap<>();
        packages.put("com.bcp.innovacxion.yapeapp", PaymentProviderSettings.YAPE);
        PACKAGES_BY_PROVIDER = Collections.unmodifiableMap(packages);
    }

    private PaymentNotificationAllowlist() {}

    static boolean contains(String packageName) {
        return providerForPackage(packageName) != null;
    }

    static String providerForPackage(String packageName) {
        return packageName == null ? null : PACKAGES_BY_PROVIDER.get(packageName);
    }
}
