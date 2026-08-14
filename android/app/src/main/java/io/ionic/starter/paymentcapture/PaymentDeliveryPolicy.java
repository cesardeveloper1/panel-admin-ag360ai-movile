package io.ionic.starter.paymentcapture;

final class PaymentDeliveryPolicy {
    enum Outcome { ACK, BLOCK, DEAD_LETTER, RETRY }

    private PaymentDeliveryPolicy() {}

    static Outcome classify(int status) {
        if ((status >= 200 && status < 300) || status == 409) return Outcome.ACK;
        if (status == 401 || status == 403) return Outcome.BLOCK;
        if (status == 400 || status == 404 || status == 422) return Outcome.DEAD_LETTER;
        return Outcome.RETRY;
    }

    static long retryDelayMillis(int attempts, String stableKey) {
        long exponent = Math.min(Math.max(attempts, 0), 6);
        long jitter = Math.abs(stableKey.hashCode() % 3_000);
        return Math.min(15 * 60_000L, (10_000L * (1L << exponent)) + jitter);
    }
}
