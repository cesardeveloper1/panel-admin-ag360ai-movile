package io.ionic.starter.printing;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.content.pm.PackageManager;
import android.os.Build;
import android.net.DhcpInfo;
import android.net.wifi.WifiManager;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(
    name = "ThermalPrinter",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = { Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN }
        )
    }
)
public final class ThermalPrinterPlugin extends Plugin {
    private final ExecutorService printExecutor = Executors.newSingleThreadExecutor();
    private ThermalPrinterStore store;

    @Override
    public void load() {
        store = new ThermalPrinterStore(getContext());
    }

    @Override
    protected void handleOnDestroy() {
        printExecutor.shutdown();
    }

    @PluginMethod
    public void getCapabilities(PluginCall call) {
        call.resolve(capabilities());
    }

    @PluginMethod
    public void requestBluetoothPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || hasBluetoothPermission()) {
            call.resolve(capabilities());
            return;
        }
        requestPermissionForAlias("bluetooth", call, "bluetoothPermissionCallback");
    }

    @PermissionCallback
    private void bluetoothPermissionCallback(PluginCall call) {
        call.resolve(capabilities());
    }

    @PluginMethod
    public void listDevices(PluginCall call) {
        if (!hasBluetoothPermission()) {
            call.reject("Bluetooth permission is required", "PERMISSION_DENIED");
            return;
        }
        JSObject result = new JSObject();
        List<JSObject> devices = new ArrayList<>();
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            Set<BluetoothDevice> bonded = adapter == null ? null : adapter.getBondedDevices();
            if (bonded != null) {
                for (BluetoothDevice device : bonded) {
                    JSObject item = new JSObject();
                    item.put("id", device.getAddress());
                    item.put("name", device.getName() == null ? device.getAddress() : device.getName());
                    item.put("transport", "bluetooth-classic");
                    item.put("paired", true);
                    devices.add(item);
                }
            }
            result.put("devices", new JSArray(devices));
            call.resolve(result);
        } catch (SecurityException exception) {
            call.reject("Bluetooth permission is required", "PERMISSION_DENIED");
        }
    }

    @PluginMethod
    public void scanNetwork(PluginCall call) {
        printExecutor.execute(() -> {
            JSObject result = new JSObject();
            List<JSObject> devices = new ArrayList<>();
            try {
                WifiManager wifi = (WifiManager) getContext().getApplicationContext().getSystemService(android.content.Context.WIFI_SERVICE);
                DhcpInfo dhcp = wifi == null ? null : wifi.getDhcpInfo();
                if (dhcp == null || dhcp.ipAddress == 0 || dhcp.netmask == 0) {
                    call.reject("Wi-Fi network is unavailable", "NETWORK_UNAVAILABLE");
                    return;
                }
                int network = dhcp.ipAddress & dhcp.netmask;
                int broadcast = network | ~dhcp.netmask;
                for (int address = network + 1; address < broadcast; address++) {
                    String host = ipv4(address);
                    if (host.equals(ipv4(dhcp.ipAddress))) continue;
                    try (java.net.Socket socket = new java.net.Socket()) {
                        socket.connect(new java.net.InetSocketAddress(host, 9100), 120);
                        JSObject item = new JSObject();
                        item.put("id", host);
                        item.put("name", "Impresora de red");
                        item.put("transport", "tcp");
                        item.put("paired", false);
                        item.put("host", host);
                        item.put("port", 9100);
                        devices.add(item);
                    } catch (Exception ignored) { }
                    if (devices.size() >= 20) break;
                }
                result.put("devices", new JSArray(devices));
                call.resolve(result);
            } catch (Exception exception) {
                call.reject("Could not scan the local network", "NETWORK_SCAN_FAILED");
            }
        });
    }

    private static String ipv4(int value) {
        return (value & 0xff) + "." + ((value >> 8) & 0xff) + "." + ((value >> 16) & 0xff) + "." + ((value >> 24) & 0xff);
    }

    @PluginMethod
    public void getConfig(PluginCall call) {
        JSObject result = new JSObject();
        JSObject config = store.getConfig();
        result.put("config", config == null ? JSONObject.NULL : config);
        call.resolve(result);
    }

    @PluginMethod
    public void saveConfig(PluginCall call) {
        JSObject config = call.getObject("config");
        String error = validateConfig(config, false);
        if (error != null) {
            call.reject(error, "UNSUPPORTED_PRINTER");
            return;
        }
        store.saveConfig(config);
        JSObject result = new JSObject();
        result.put("config", config);
        call.resolve(result);
    }

    @PluginMethod
    public void clearConfig(PluginCall call) {
        store.clearConfig();
        call.resolve();
    }

    @PluginMethod
    public void testPrint(PluginCall call) {
        JSObject config = store.getConfig();
        String error = validateConfig(config, true);
        if (error != null) {
            call.reject(error, "UNSUPPORTED_PRINTER");
            return;
        }
        printExecutor.execute(() -> {
            try {
                byte[] ticket = ThermalTicketEncoder.testTicket(config);
                for (int copy = 0; copy < config.optInt("copies", 1); copy += 1) {
                    ThermalPrinterTransport.write(getContext(), config, ticket);
                }
                call.resolve();
            } catch (ThermalPrinterTransport.PrinterException exception) {
                call.reject(exception.getMessage(), exception.code);
            } catch (Exception exception) {
                call.reject("Unexpected printer error", "UNKNOWN_TRANSIENT");
            }
        });
    }

    @PluginMethod
    public void printJob(PluginCall call) {
        String jobId = call.getString("jobId");
        String leaseId = call.getString("leaseId");
        String payloadHash = call.getString("payloadHash");
        String ticketType = call.getString("ticketType", "full");
        JSObject payload = call.getObject("payload");
        JSObject config = store.getConfig();
        if (jobId == null || leaseId == null || payloadHash == null || payload == null) {
            call.reject("Invalid print payload", "PAYLOAD_INVALID");
            return;
        }
        String configError = validateConfig(config, true);
        if (configError != null) {
            call.reject(configError, "UNSUPPORTED_PRINTER");
            return;
        }

        printExecutor.execute(() -> {
            JSONObject previous = store.find(jobId);
            String previousState = previous == null ? "" : previous.optString("state");
            if (previous != null && payloadHash.equals(previous.optString("payloadHash")) &&
                ("printed_ack_pending".equals(previousState) || "completed".equals(previousState))) {
                call.resolve(printResult(jobId, true));
                return;
            }
            store.update(jobId, leaseId, payloadHash, ticketType, "printing", null);
            notifyState(jobId);
            try {
                byte[] ticket = ThermalTicketEncoder.orderTicket(payload, config, ticketType);
                for (int copy = 0; copy < config.optInt("copies", 1); copy += 1) {
                    ThermalPrinterTransport.write(getContext(), config, ticket);
                }
                store.update(jobId, leaseId, payloadHash, ticketType, "printed_ack_pending", null);
                notifyState(jobId);
                call.resolve(printResult(jobId, false));
            } catch (ThermalPrinterTransport.PrinterException exception) {
                store.update(jobId, leaseId, payloadHash, ticketType, "failed", exception.code);
                notifyState(jobId);
                call.reject(exception.getMessage(), exception.code);
            } catch (Exception exception) {
                store.update(jobId, leaseId, payloadHash, ticketType, "failed", "UNKNOWN_TRANSIENT");
                notifyState(jobId);
                call.reject("Unexpected printer error", "UNKNOWN_TRANSIENT");
            }
        });
    }

    @PluginMethod
    public void getHistory(PluginCall call) {
        Integer requested = call.getInt("limit");
        JSObject result = new JSObject();
        result.put("jobs", store.history(Math.max(1, Math.min(requested == null ? 50 : requested, 50))));
        call.resolve(result);
    }

    @PluginMethod
    public void getPendingAcks(PluginCall call) {
        JSObject result = new JSObject();
        result.put("jobs", store.pendingAcks());
        call.resolve(result);
    }

    @PluginMethod
    public void markCompleted(PluginCall call) {
        updateFinalState(call, "completed", null);
    }

    @PluginMethod
    public void markFailed(PluginCall call) {
        updateFinalState(call, "failed", call.getString("errorCode", "UNKNOWN_TRANSIENT"));
    }

    private void updateFinalState(PluginCall call, String state, String errorCode) {
        String jobId = call.getString("jobId");
        String leaseId = call.getString("leaseId");
        if (jobId == null || leaseId == null) {
            call.reject("Missing job state", "PAYLOAD_INVALID");
            return;
        }
        JSONObject previous = store.find(jobId);
        store.update(
            jobId,
            leaseId,
            previous == null ? "" : previous.optString("payloadHash"),
            previous == null ? "full" : previous.optString("ticketType", "full"),
            state,
            errorCode
        );
        notifyState(jobId);
        call.resolve();
    }

    private JSObject capabilities() {
        JSObject result = new JSObject();
        result.put("available", true);
        result.put("platform", "android");
        result.put("transports", new JSArray(Arrays.asList("tcp", "bluetooth-classic")));
        result.put("bluetoothPermission", hasBluetoothPermission() ? "granted" : "denied");
        return result;
    }

    private boolean hasBluetoothPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
            (getPermissionState("bluetooth") == PermissionState.GRANTED &&
                ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED);
    }

    private String validateConfig(JSONObject config, boolean requireEnabled) {
        if (config == null) return "Printing is not configured";
        if (requireEnabled && !config.optBoolean("enabled", true)) return "Printing is disabled";
        if (config.optString("branchId").trim().isEmpty()) return "A location is required";
        if (!config.optBoolean("enabled", true)) return null;
        String transport = config.optString("transport");
        if ("tcp".equals(transport) && config.optString("host").trim().isEmpty()) return "A printer IP is required";
        if ("bluetooth-classic".equals(transport) && config.optString("deviceRef").trim().isEmpty()) return "A paired printer is required";
        if (!"tcp".equals(transport) && !"bluetooth-classic".equals(transport)) return "Unsupported printer transport";
        return null;
    }

    private JSObject printResult(String jobId, boolean alreadyPrinted) {
        JSObject result = new JSObject();
        result.put("jobId", jobId);
        result.put("state", "printed_ack_pending");
        result.put("alreadyPrinted", alreadyPrinted);
        return result;
    }

    private void notifyState(String jobId) {
        JSONObject state = store.find(jobId);
        if (state == null) return;
        try {
            notifyListeners("printerStateChanged", JSObject.fromJSONObject(state), true);
        } catch (Exception ignored) {
            // La persistencia nativa es la fuente de verdad; un listener web ausente no bloquea la cola.
        }
    }
}
