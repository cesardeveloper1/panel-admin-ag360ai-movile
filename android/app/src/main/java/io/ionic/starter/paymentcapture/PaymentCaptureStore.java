package io.ionic.starter.paymentcapture;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.time.Instant;
import java.util.UUID;

final class PaymentCaptureStore {
    private static final String PREFERENCES = "payment_notification_capture_v1";
    private static final String QUEUE_KEY = "encrypted_capture_queue";
    private static final String LAST_ACCEPTED_AT_KEY = "last_accepted_at";
    private static final String LAST_ERROR_CODE_KEY = "last_error_code";
    private static final int MAX_PENDING_EVENTS = 500;
    private static final Object QUEUE_LOCK = new Object();

    private final SharedPreferences preferences;

    PaymentCaptureStore(Context context) {
        preferences = context.getApplicationContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }

    CaptureResult capture(
        String packageName,
        String notificationKey,
        int notificationId,
        long postTime,
        String title,
        String body
    ) {
        synchronized (QUEUE_LOCK) {
            try {
                JSONArray queue = readQueue();
                String contentHash = PaymentNotificationIdentity.contentHash(title, body);
                String stableKey = PaymentNotificationIdentity.stableKey(
                    packageName,
                    notificationKey,
                    postTime,
                    contentHash
                );

                for (int index = 0; index < queue.length(); index += 1) {
                    if (stableKey.equals(queue.getJSONObject(index).optString("stableKey"))) {
                        return CaptureResult.duplicate(queue.length());
                    }
                }

                String capturedAt = Instant.now().toString();
                JSONObject envelope = new JSONObject();
                envelope.put("localEventId", UUID.randomUUID().toString());
                envelope.put("packageName", packageName);
                envelope.put("notificationKey", notificationKey);
                envelope.put("notificationId", notificationId);
                envelope.put("postTime", postTime);
                envelope.put("capturedAt", capturedAt);
                envelope.put("titleCiphertext", PaymentCrypto.encrypt(PaymentNotificationIdentity.normalize(title)));
                envelope.put("bodyCiphertext", PaymentCrypto.encrypt(PaymentNotificationIdentity.normalize(body)));
                envelope.put("contentHash", contentHash);
                envelope.put("stableKey", stableKey);
                envelope.put("state", "pending");
                envelope.put("attempts", 0);

                queue.put(envelope);
            while (queue.length() > MAX_PENDING_EVENTS) {
                int terminalIndex = findOldestTerminalIndex(queue);
                if (terminalIndex < 0) break;
                queue.remove(terminalIndex);
                }

                boolean persisted = preferences.edit()
                    .putString(QUEUE_KEY, queue.toString())
                    .putString(LAST_ACCEPTED_AT_KEY, capturedAt)
                    .remove(LAST_ERROR_CODE_KEY)
                    .commit();
                if (!persisted) {
                    preferences.edit().putString(LAST_ERROR_CODE_KEY, "CAPTURE_PERSIST_FAILED").apply();
                    return CaptureResult.failed();
                }

                return CaptureResult.created(envelope.getString("localEventId"), capturedAt, queue.length());
            } catch (Exception exception) {
                preferences.edit().putString(LAST_ERROR_CODE_KEY, "CAPTURE_PERSIST_FAILED").apply();
                return CaptureResult.failed();
            }
        }
    }

    int getPendingCount() {
        synchronized (QUEUE_LOCK) {
            JSONArray queue = readQueue();
            int pending = 0;
            for (int index = 0; index < queue.length(); index += 1) {
                String state = queue.optJSONObject(index).optString("state");
                if ("captured".equals(state) || "pending".equals(state) || "sending".equals(state) || "retry".equals(state)) {
                    pending += 1;
                }
            }
            return pending;
        }
    }

    int getDeadLetterCount() {
        synchronized (QUEUE_LOCK) {
            JSONArray queue = readQueue();
            int failed = 0;
            for (int index = 0; index < queue.length(); index += 1) {
                if ("dead_letter".equals(queue.optJSONObject(index).optString("state"))) {
                    failed += 1;
                }
            }
            return failed;
        }
    }

    DeliveryItem claimNext(long nowMillis, long leaseDurationMillis) {
        synchronized (QUEUE_LOCK) {
            try {
                JSONArray queue = readQueue();
                for (int index = 0; index < queue.length(); index += 1) {
                    JSONObject envelope = queue.getJSONObject(index);
                    String state = envelope.optString("state", "pending");
                    long leaseUntil = envelope.optLong("leaseUntil", 0L);
                    boolean expiredSending = "sending".equals(state) && leaseUntil <= nowMillis;
                    boolean eligible = "captured".equals(state)
                        || "pending".equals(state)
                        || expiredSending
                        || "retry".equals(state);
                    if (!eligible) continue;

                    envelope.put("state", "sending");
                    envelope.put("leaseUntil", nowMillis + leaseDurationMillis);
                    envelope.put("attempts", envelope.optInt("attempts", 0) + 1);
                    if (!writeQueue(queue)) return null;

                    return new DeliveryItem(
                        envelope.getString("localEventId"),
                        envelope.getString("stableKey"),
                        envelope.getLong("postTime"),
                        envelope.getString("contentHash"),
                        PaymentCrypto.decrypt(envelope.getString("titleCiphertext")),
                        PaymentCrypto.decrypt(envelope.getString("bodyCiphertext")),
                        envelope.getInt("attempts")
                    );
                }
            } catch (Exception exception) {
                preferences.edit().putString(LAST_ERROR_CODE_KEY, "CAPTURE_CLAIM_FAILED").apply();
            }
            return null;
        }
    }

    void markSent(String localEventId, String trackerEventId, boolean duplicate) {
        mutate(localEventId, envelope -> {
            envelope.put("state", "sent");
            envelope.put("trackerEventId", trackerEventId);
            envelope.put("duplicate", duplicate);
            envelope.put("sentAt", Instant.now().toString());
            envelope.remove("titleCiphertext");
            envelope.remove("bodyCiphertext");
            envelope.remove("leaseUntil");
            envelope.remove("nextAttemptAt");
            envelope.remove("lastErrorCode");
        });
    }

    void markRetry(String localEventId, String errorCode, long nextAttemptAt) {
        mutate(localEventId, envelope -> {
            envelope.put("state", "retry");
            envelope.put("lastErrorCode", errorCode);
            envelope.put("nextAttemptAt", nextAttemptAt);
            envelope.remove("leaseUntil");
        });
    }

    void markDeadLetter(String localEventId, String errorCode) {
        mutate(localEventId, envelope -> {
            envelope.put("state", "dead_letter");
            envelope.put("lastErrorCode", errorCode);
            envelope.remove("leaseUntil");
            envelope.remove("nextAttemptAt");
        });
    }

    int retryDeadLetters() {
        synchronized (QUEUE_LOCK) {
            JSONArray queue = readQueue();
            int updated = 0;
            try {
                for (int index = 0; index < queue.length(); index += 1) {
                    JSONObject envelope = queue.getJSONObject(index);
                    if (!"dead_letter".equals(envelope.optString("state"))) continue;
                    if ("DEVICE_UNLINKED".equals(envelope.optString("lastErrorCode"))) continue;
                    envelope.put("state", "pending");
                    envelope.remove("lastErrorCode");
                    updated += 1;
                }
                if (updated > 0) writeQueue(queue);
            } catch (JSONException exception) {
                preferences.edit().putString(LAST_ERROR_CODE_KEY, "CAPTURE_RETRY_RESET_FAILED").apply();
            }
            return updated;
        }
    }

    int quarantineUnsent(String errorCode) {
        synchronized (QUEUE_LOCK) {
            JSONArray queue = readQueue();
            int updated = 0;
            try {
                for (int index = 0; index < queue.length(); index += 1) {
                    JSONObject envelope = queue.getJSONObject(index);
                    String state = envelope.optString("state");
                    if (!"captured".equals(state)
                        && !"pending".equals(state)
                        && !"sending".equals(state)
                        && !"retry".equals(state)) continue;
                    envelope.put("state", "dead_letter");
                    envelope.put("lastErrorCode", errorCode);
                    envelope.remove("leaseUntil");
                    envelope.remove("nextAttemptAt");
                    updated += 1;
                }
                if (updated > 0) writeQueue(queue);
            } catch (JSONException exception) {
                preferences.edit().putString(LAST_ERROR_CODE_KEY, "CAPTURE_QUARANTINE_FAILED").apply();
            }
            return updated;
        }
    }

    String getLastAcceptedAt() {
        return preferences.getString(LAST_ACCEPTED_AT_KEY, null);
    }

    String getLastErrorCode() {
        return preferences.getString(LAST_ERROR_CODE_KEY, null);
    }

    private JSONArray readQueue() {
        String rawQueue = preferences.getString(QUEUE_KEY, "[]");
        try {
            return new JSONArray(rawQueue);
        } catch (JSONException exception) {
            preferences.edit()
                .putString(QUEUE_KEY, "[]")
                .putString(LAST_ERROR_CODE_KEY, "CAPTURE_QUEUE_RESET")
                .apply();
            return new JSONArray();
        }
    }

    private boolean writeQueue(JSONArray queue) {
        return preferences.edit().putString(QUEUE_KEY, queue.toString()).commit();
    }

    private static int findOldestTerminalIndex(JSONArray queue) {
        for (int index = 0; index < queue.length(); index += 1) {
            JSONObject envelope = queue.optJSONObject(index);
            if (envelope == null) continue;
            String state = envelope.optString("state");
            if ("sent".equals(state) || "dead_letter".equals(state)) return index;
        }
        return -1;
    }

    private void mutate(String localEventId, EnvelopeMutation mutation) {
        synchronized (QUEUE_LOCK) {
            JSONArray queue = readQueue();
            try {
                for (int index = 0; index < queue.length(); index += 1) {
                    JSONObject envelope = queue.getJSONObject(index);
                    if (!localEventId.equals(envelope.optString("localEventId"))) continue;
                    mutation.apply(envelope);
                    writeQueue(queue);
                    return;
                }
            } catch (JSONException exception) {
                preferences.edit().putString(LAST_ERROR_CODE_KEY, "CAPTURE_STATE_UPDATE_FAILED").apply();
            }
        }
    }

    private interface EnvelopeMutation {
        void apply(JSONObject envelope) throws JSONException;
    }

    static final class DeliveryItem {
        final String localEventId;
        final String providerEventId;
        final long postTime;
        final String contentHash;
        final String title;
        final String body;
        final int attempts;

        DeliveryItem(
            String localEventId,
            String providerEventId,
            long postTime,
            String contentHash,
            String title,
            String body,
            int attempts
        ) {
            this.localEventId = localEventId;
            this.providerEventId = providerEventId;
            this.postTime = postTime;
            this.contentHash = contentHash;
            this.title = title;
            this.body = body;
            this.attempts = attempts;
        }
    }

    static final class CaptureResult {
        final boolean created;
        final boolean failed;
        final String localEventId;
        final String capturedAt;
        final int pendingCount;

        private CaptureResult(
            boolean created,
            boolean failed,
            String localEventId,
            String capturedAt,
            int pendingCount
        ) {
            this.created = created;
            this.failed = failed;
            this.localEventId = localEventId;
            this.capturedAt = capturedAt;
            this.pendingCount = pendingCount;
        }

        static CaptureResult created(String localEventId, String capturedAt, int pendingCount) {
            return new CaptureResult(true, false, localEventId, capturedAt, pendingCount);
        }

        static CaptureResult duplicate(int pendingCount) {
            return new CaptureResult(false, false, null, null, pendingCount);
        }

        static CaptureResult failed() {
            return new CaptureResult(false, true, null, null, 0);
        }
    }
}
