package io.ionic.starter.paymentcapture;

import android.app.Notification;
import android.content.ComponentName;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

public final class PaymentNotificationListenerService extends NotificationListenerService {
    private static volatile boolean connected = false;

    static boolean isConnected() {
        return connected;
    }

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        connected = true;
    }

    @Override
    public void onListenerDisconnected() {
        connected = false;
        requestRebind(new ComponentName(this, PaymentNotificationListenerService.class));
        super.onListenerDisconnected();
    }

    @Override
    public void onDestroy() {
        connected = false;
        super.onDestroy();
    }

    @Override
    public void onNotificationPosted(StatusBarNotification statusBarNotification) {
        if (statusBarNotification == null) {
            return;
        }

        String packageName = statusBarNotification.getPackageName();
        if (!PaymentNotificationAllowlist.contains(packageName)) {
            return;
        }
        if (!new PaymentDeviceStore(this).canCapture()) {
            return;
        }

        Notification notification = statusBarNotification.getNotification();
        Bundle extras = notification == null ? null : notification.extras;
        String title = readText(extras, Notification.EXTRA_TITLE);
        String body = readText(extras, Notification.EXTRA_BIG_TEXT);
        if (body.isEmpty()) {
            body = readText(extras, Notification.EXTRA_TEXT);
        }
        if (title.isEmpty() && body.isEmpty()) {
            return;
        }

        PaymentCaptureStore.CaptureResult result = new PaymentCaptureStore(this).capture(
            packageName,
            statusBarNotification.getKey(),
            statusBarNotification.getId(),
            statusBarNotification.getPostTime(),
            title,
            body
        );

        if (result.created) {
            PaymentNotificationCapturePlugin.notifyCapturePersisted(result);
            PaymentDeliveryScheduler.schedule(this);
        }
    }

    private static String readText(Bundle extras, String key) {
        if (extras == null) {
            return "";
        }
        CharSequence value = extras.getCharSequence(key);
        return value == null ? "" : value.toString().trim();
    }
}
