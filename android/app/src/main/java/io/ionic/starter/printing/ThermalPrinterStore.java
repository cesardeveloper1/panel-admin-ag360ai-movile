package io.ionic.starter.printing;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

final class ThermalPrinterStore {
    private static final String PREFERENCES = "agiliza_mobile_printing_v1";
    private static final String CONFIG = "config";
    private static final String HISTORY = "history";
    private static final int HISTORY_LIMIT = 50;
    private final SharedPreferences preferences;

    ThermalPrinterStore(Context context) {
        preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }

    synchronized JSObject getConfig() {
        String raw = preferences.getString(CONFIG, null);
        if (raw == null) return null;
        try {
            return JSObject.fromJSONObject(new JSONObject(raw));
        } catch (Exception ignored) {
            return null;
        }
    }

    synchronized void saveConfig(JSONObject config) {
        preferences.edit().putString(CONFIG, config.toString()).apply();
    }

    synchronized void clearConfig() {
        preferences.edit().remove(CONFIG).apply();
    }

    synchronized JSONObject find(String jobId) {
        JSONArray history = readHistory();
        for (int index = 0; index < history.length(); index += 1) {
            JSONObject item = history.optJSONObject(index);
            if (item != null && jobId.equals(item.optString("jobId"))) return item;
        }
        return null;
    }

    synchronized JSONObject update(
        String jobId,
        String leaseId,
        String payloadHash,
        String ticketType,
        String state,
        String errorCode
    ) {
        JSONArray history = readHistory();
        JSONObject updated = null;
        JSONArray next = new JSONArray();
        for (int index = 0; index < history.length(); index += 1) {
            JSONObject item = history.optJSONObject(index);
            if (item == null) continue;
            if (jobId.equals(item.optString("jobId"))) {
                updated = item;
                continue;
            }
            next.put(item);
        }
        if (updated == null) {
            updated = new JSONObject();
            put(updated, "jobId", jobId);
            put(updated, "createdAt", now());
            put(updated, "attempts", 0);
            put(updated, "payloadVersion", 1);
            put(updated, "completedAt", JSONObject.NULL);
            put(updated, "nextAttemptAt", JSONObject.NULL);
        }
        put(updated, "leaseId", leaseId == null ? JSONObject.NULL : leaseId);
        put(updated, "payloadHash", payloadHash == null ? "" : payloadHash);
        put(updated, "ticketType", ticketType == null ? "full" : ticketType);
        put(updated, "state", state);
        put(updated, "lastErrorCode", errorCode == null ? JSONObject.NULL : errorCode);
        if ("printing".equals(state)) {
            put(updated, "attempts", updated.optInt("attempts", 0) + 1);
        }
        if ("completed".equals(state)) put(updated, "completedAt", now());
        JSONArray bounded = new JSONArray();
        bounded.put(updated);
        for (int index = 0; index < next.length() && bounded.length() < HISTORY_LIMIT; index += 1) {
            bounded.put(next.optJSONObject(index));
        }
        preferences.edit().putString(HISTORY, bounded.toString()).apply();
        return updated;
    }

    synchronized JSArray history(int limit) {
        JSONArray stored = readHistory();
        List<JSObject> items = new ArrayList<>();
        for (int index = 0; index < stored.length() && index < limit; index += 1) {
            JSONObject item = stored.optJSONObject(index);
            JSObject converted = toJSObject(item);
            if (converted != null) items.add(converted);
        }
        return new JSArray(items);
    }

    synchronized JSArray pendingAcks() {
        JSONArray stored = readHistory();
        List<JSObject> items = new ArrayList<>();
        for (int index = 0; index < stored.length(); index += 1) {
            JSONObject item = stored.optJSONObject(index);
            if (item != null && "printed_ack_pending".equals(item.optString("state"))) {
                JSObject converted = toJSObject(item);
                if (converted != null) items.add(converted);
            }
        }
        return new JSArray(items);
    }

    private JSONArray readHistory() {
        try {
            return new JSONArray(preferences.getString(HISTORY, "[]"));
        } catch (Exception ignored) {
            return new JSONArray();
        }
    }

    private static void put(JSONObject object, String key, Object value) {
        try {
            object.put(key, value);
        } catch (Exception ignored) {
            // Values are local primitives and cannot normally fail JSON encoding.
        }
    }

    private static JSObject toJSObject(JSONObject object) {
        if (object == null) return null;
        try {
            return JSObject.fromJSONObject(object);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static String now() {
        java.text.SimpleDateFormat format = new java.text.SimpleDateFormat(
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            java.util.Locale.US
        );
        format.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
        return format.format(new java.util.Date());
    }
}
