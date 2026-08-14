package io.ionic.starter.paymentcapture;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

final class PaymentNotificationIdentity {
    private PaymentNotificationIdentity() {}

    static String contentHash(String title, String body) throws Exception {
        return sha256(normalize(title) + "\n" + normalize(body));
    }

    static String stableKey(
        String packageName,
        String notificationKey,
        long postTime,
        String contentHash
    ) throws Exception {
        return sha256(packageName + "|" + notificationKey + "|" + postTime + "|" + contentHash);
    }

    static String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private static String sha256(String value) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder result = new StringBuilder(hash.length * 2);
        for (byte item : hash) {
            result.append(String.format("%02x", item));
        }
        return result.toString();
    }
}
