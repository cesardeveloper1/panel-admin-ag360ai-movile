package io.ionic.starter.paymentcapture;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONObject;

import java.time.Instant;

public final class PaymentDeliveryWorker extends Worker {
    private static final long LEASE_MILLIS = 45_000L;
    private static final int MAX_ITEMS_PER_RUN = 20;
    private static final int MAX_ATTEMPTS = 8;

    public PaymentDeliveryWorker(@NonNull Context context, @NonNull WorkerParameters parameters) {
        super(context, parameters);
    }

    @NonNull
    @Override
    public Result doWork() {
        PaymentDeviceStore deviceStore = new PaymentDeviceStore(getApplicationContext());
        PaymentDeviceStore.DeviceCredential credential = deviceStore.getCredential();

        if (deviceStore.isUnlinkPending()) {
            return revokeDevice(deviceStore, credential);
        }
        if (!deviceStore.isLinked() || credential == null) return Result.success();

        PaymentCaptureStore captureStore = new PaymentCaptureStore(getApplicationContext());
        for (int processed = 0; processed < MAX_ITEMS_PER_RUN; processed += 1) {
            if (deviceStore.isUnlinkPending()) {
                return revokeDevice(deviceStore, deviceStore.getCredential());
            }
            PaymentCaptureStore.DeliveryItem item = captureStore.claimNext(
                System.currentTimeMillis(),
                LEASE_MILLIS
            );
            if (item == null) return Result.success();

            YapeNotificationParser.ParsedPayment parsed = YapeNotificationParser.parse(item.title, item.body);
            if (parsed == null) {
                captureStore.markDeadLetter(item.localEventId, "YAPE_PAYLOAD_UNSUPPORTED");
                continue;
            }

            try {
                JSONObject event = new JSONObject();
                event.put("schemaVersion", 1);
                event.put("providerEventId", item.providerEventId);
                event.put("source", "yape");
                event.put("amountMinor", parsed.amountMinor);
                event.put("currency", "PEN");
                event.put("occurredAt", Instant.ofEpochMilli(item.postTime).toString());
                event.put("postTime", item.postTime);
                event.put("rawPayloadHash", item.contentHash);

                PaymentTrackerClient.Response response = PaymentTrackerClient.ingest(
                    credential,
                    item.providerEventId,
                    event
                );
                PaymentDeliveryPolicy.Outcome outcome = PaymentDeliveryPolicy.classify(response.status);
                if (outcome == PaymentDeliveryPolicy.Outcome.ACK) {
                    JSONObject data = response.body.optJSONObject("data");
                    JSONObject root = data == null ? response.body : data;
                    String trackerEventId = root.optString("trackerEventId", root.optString("eventId", item.providerEventId));
                    boolean duplicate = response.status == 409 || root.optBoolean("duplicate", false);
                    captureStore.markSent(item.localEventId, trackerEventId, duplicate);
                    deviceStore.markAck();
                    continue;
                }
                if (outcome == PaymentDeliveryPolicy.Outcome.BLOCK) {
                    captureStore.markRetry(item.localEventId, "DEVICE_UNAUTHORIZED", System.currentTimeMillis() + 60_000L);
                    deviceStore.block("DEVICE_UNAUTHORIZED");
                    return Result.failure();
                }
                if (outcome == PaymentDeliveryPolicy.Outcome.DEAD_LETTER) {
                    captureStore.markDeadLetter(item.localEventId, "TRACKER_REJECTED_" + response.status);
                    continue;
                }
                return retry(captureStore, deviceStore, item, "TRACKER_HTTP_" + response.status);
            } catch (Exception exception) {
                return retry(captureStore, deviceStore, item, "TRACKER_NETWORK_ERROR");
            }
        }

        return Result.retry();
    }

    private Result revokeDevice(
        PaymentDeviceStore deviceStore,
        PaymentDeviceStore.DeviceCredential credential
    ) {
        if (credential == null) {
            deviceStore.clearCredential();
            return Result.success();
        }
        try {
            PaymentTrackerClient.Response response = PaymentTrackerClient.revoke(credential);
            if (response.isSuccess() || response.status == 401 || response.status == 404) {
                deviceStore.clearCredential();
                return Result.success();
            }
            deviceStore.markDeliveryError("DEVICE_REVOKE_HTTP_" + response.status);
            return Result.retry();
        } catch (Exception exception) {
            deviceStore.markDeliveryError("DEVICE_REVOKE_NETWORK_ERROR");
            return Result.retry();
        }
    }

    private Result retry(
        PaymentCaptureStore captureStore,
        PaymentDeviceStore deviceStore,
        PaymentCaptureStore.DeliveryItem item,
        String errorCode
    ) {
        if (item.attempts >= MAX_ATTEMPTS) {
            captureStore.markDeadLetter(item.localEventId, errorCode);
            deviceStore.markDeliveryError(errorCode);
            return Result.success();
        }
        long delay = PaymentDeliveryPolicy.retryDelayMillis(item.attempts, item.providerEventId);
        captureStore.markRetry(item.localEventId, errorCode, System.currentTimeMillis() + delay);
        deviceStore.markDeliveryError(errorCode);
        return Result.retry();
    }
}
