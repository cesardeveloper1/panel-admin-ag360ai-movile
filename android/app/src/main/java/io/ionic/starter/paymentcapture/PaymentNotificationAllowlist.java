package io.ionic.starter.paymentcapture;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

final class PaymentNotificationAllowlist {
    // Nunca aceptar paquetes por prefijo o nombre visible.
    private static final Set<String> ALLOWED_PACKAGES = Collections.unmodifiableSet(
        new HashSet<>(Collections.singletonList("com.bcp.innovacxion.yapeapp"))
    );

    private PaymentNotificationAllowlist() {}

    static boolean contains(String packageName) {
        return packageName != null && ALLOWED_PACKAGES.contains(packageName);
    }
}
