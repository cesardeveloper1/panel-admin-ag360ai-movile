package io.ionic.starter.paymentcapture;

import android.content.Intent;
import android.provider.Settings;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "PaymentNotificationCapture")
public final class PaymentNotificationCapturePlugin extends Plugin {
    private static WeakReference<PaymentNotificationCapturePlugin> activePlugin = new WeakReference<>(null);

    @Override
    public void load() {
        activePlugin = new WeakReference<>(this);
    }

    @PluginMethod
    public void getPermissionStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", hasNotificationAccess());
        call.resolve(result);
    }

    @PluginMethod
    public void openNotificationListenerSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception exception) {
            call.reject("No se pudo abrir el acceso a notificaciones", "SETTINGS_UNAVAILABLE");
        }
    }

    @PluginMethod
    public void getDiagnostics(PluginCall call) {
        PaymentCaptureStore store = new PaymentCaptureStore(getContext());
        PaymentDeviceStore deviceStore = new PaymentDeviceStore(getContext());
        PaymentDeviceStore.DeviceCredential credential = deviceStore.getCredential();
        int pendingCount = store.getPendingCount();
        if ((deviceStore.isLinked() && pendingCount > 0) || deviceStore.isUnlinkPending()) {
            PaymentDeliveryScheduler.schedule(getContext());
        }
        JSObject result = new JSObject();
        result.put("permissionGranted", hasNotificationAccess());
        result.put("listenerConnected", PaymentNotificationListenerService.isConnected());
        result.put("lastAcceptedAt", store.getLastAcceptedAt());
        result.put("pendingCount", pendingCount);
        result.put("lastErrorCode", deviceStore.getLastErrorCode() != null
            ? deviceStore.getLastErrorCode()
            : store.getLastErrorCode());
        result.put("bindingState", deviceStore.getState());
        result.put("deviceId", credential == null ? null : credential.deviceId);
        result.put("branchId", credential == null ? null : credential.branchId);
        result.put("branchName", credential == null ? null : credential.branchName);
        result.put("tokenExpiresAt", credential == null ? null : credential.expiresAt);
        result.put("lastAckAt", deviceStore.getLastAckAt());
        result.put("deadLetterCount", store.getDeadLetterCount());
        call.resolve(result);
    }

    @PluginMethod
    public void pairDevice(PluginCall call) {
        String ticket = call.getString("ticket");
        String trackerBaseUrl = call.getString("trackerBaseUrl");
        if (ticket == null || ticket.trim().isEmpty() || trackerBaseUrl == null) {
            call.reject("Faltan datos de vinculación", "PAIRING_INPUT_INVALID");
            return;
        }

        getBridge().execute(() -> {
            try {
                PaymentDeviceStore deviceStore = new PaymentDeviceStore(getContext());
                if (deviceStore.isUnlinkPending()) {
                    call.reject("La desvinculación anterior sigue pendiente", "PAIRING_UNLINK_PENDING");
                    return;
                }
                PaymentDeviceStore.Identity identity = deviceStore.getOrCreateIdentity();
                PaymentTrackerClient.Response response = PaymentTrackerClient.exchangeTicket(
                    trackerBaseUrl,
                    ticket.trim(),
                    identity
                );
                if (!response.isSuccess()) {
                    call.reject("El ticket no pudo canjearse", "PAIRING_HTTP_" + response.status);
                    return;
                }

                JSONObject data = response.body.optJSONObject("data");
                JSONObject root = data == null ? response.body : data;
                String deviceId = root.optString("deviceId");
                String token = root.optString("token", root.optString("deviceToken"));
                if (deviceId.isEmpty() || token.isEmpty()) {
                    call.reject("Respuesta de vinculación inválida", "PAIRING_RESPONSE_INVALID");
                    return;
                }

                JSONArray providerArray = root.optJSONArray("providers");
                List<String> providers = new ArrayList<>();
                if (providerArray != null) {
                    for (int index = 0; index < providerArray.length(); index += 1) {
                        String provider = providerArray.optString(index);
                        if (!provider.isEmpty()) providers.add(provider);
                    }
                }
                deviceStore.saveCredential(new PaymentDeviceStore.DeviceCredential(
                    deviceId,
                    token,
                    trackerBaseUrl,
                    root.optString("branchId"),
                    root.optString("branchName"),
                    root.optString("expiresAt"),
                    providers.toArray(new String[0])
                ));
                PaymentDeliveryScheduler.schedule(getContext());
                JSObject result = new JSObject();
                result.put("deviceId", deviceId);
                result.put("branchId", root.optString("branchId"));
                result.put("branchName", root.optString("branchName"));
                call.resolve(result);
            } catch (IllegalArgumentException exception) {
                call.reject("URL de tracker inválida", exception.getMessage());
            } catch (Exception exception) {
                call.reject("No se pudo vincular el dispositivo", "PAIRING_NETWORK_ERROR");
            }
        });
    }

    @PluginMethod
    public void unlinkDevice(PluginCall call) {
        PaymentDeviceStore deviceStore = new PaymentDeviceStore(getContext());
        deviceStore.requestUnlink();
        new PaymentCaptureStore(getContext()).quarantineUnsent("DEVICE_UNLINKED");
        PaymentDeliveryScheduler.schedule(getContext());
        call.resolve();
    }

    @PluginMethod
    public void retryFailed(PluginCall call) {
        int count = new PaymentCaptureStore(getContext()).retryDeadLetters();
        PaymentDeliveryScheduler.schedule(getContext());
        JSObject result = new JSObject();
        result.put("retriedCount", count);
        call.resolve(result);
    }

    @PluginMethod
    public void getProviderSettings(PluginCall call) {
        PaymentProviderSettings settings = new PaymentProviderSettings(getContext());
        JSObject result = new JSObject();
        JSObject yape = new JSObject();
        yape.put("enabled", settings.isEnabled(PaymentProviderSettings.YAPE));
        yape.put("supported", settings.isSupported(PaymentProviderSettings.YAPE));
        JSObject plin = new JSObject();
        plin.put("enabled", settings.isEnabled(PaymentProviderSettings.PLIN));
        plin.put("supported", settings.isSupported(PaymentProviderSettings.PLIN));
        result.put(PaymentProviderSettings.YAPE, yape);
        result.put(PaymentProviderSettings.PLIN, plin);
        call.resolve(result);
    }

    @PluginMethod
    public void setProviderEnabled(PluginCall call) {
        String provider = call.getString("provider");
        Boolean enabled = call.getBoolean("enabled");
        if (provider == null || enabled == null) {
            call.reject("Configuración de proveedor inválida", "PROVIDER_INPUT_INVALID");
            return;
        }
        try {
            boolean persisted = new PaymentProviderSettings(getContext()).setEnabled(provider, enabled);
            if (!persisted) {
                call.reject("No se pudo guardar la configuración", "PROVIDER_PERSIST_FAILED");
                return;
            }
            JSObject result = new JSObject();
            result.put("provider", provider);
            result.put("enabled", enabled);
            call.resolve(result);
        } catch (IllegalStateException exception) {
            call.reject("Proveedor aún no compatible", exception.getMessage());
        } catch (IllegalArgumentException exception) {
            call.reject("Proveedor desconocido", exception.getMessage());
        }
    }

    @PluginMethod
    public void getCaptureLogs(PluginCall call) {
        Integer requestedLimit = call.getInt("limit");
        int limit = requestedLimit == null ? 50 : requestedLimit;
        JSObject result = new JSObject();
        result.put("logs", new PaymentCaptureStore(getContext()).getCaptureLogs(limit));
        call.resolve(result);
    }

    private boolean hasNotificationAccess() {
        return NotificationManagerCompat.getEnabledListenerPackages(getContext())
            .contains(getContext().getPackageName());
    }

    static void notifyCapturePersisted(PaymentCaptureStore.CaptureResult captureResult) {
        PaymentNotificationCapturePlugin plugin = activePlugin.get();
        if (plugin == null) {
            return;
        }
        JSObject event = new JSObject();
        event.put("localEventId", captureResult.localEventId);
        event.put("capturedAt", captureResult.capturedAt);
        event.put("pendingCount", captureResult.pendingCount);
        plugin.notifyListeners("paymentNotificationCaptured", event, true);
    }
}
