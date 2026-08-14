package io.ionic.starter.printing;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.UUID;

final class ThermalPrinterTransport {
    private static final UUID SERIAL_PORT = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private static final int TIMEOUT_MS = 8_000;

    static void write(Context context, JSONObject config, byte[] bytes) throws PrinterException {
        String transport = config.optString("transport");
        if ("tcp".equals(transport)) {
            writeTcp(config, bytes);
            return;
        }
        if ("bluetooth-classic".equals(transport)) {
            writeBluetooth(context, config, bytes);
            return;
        }
        throw new PrinterException("UNSUPPORTED_PRINTER", "Unsupported printer transport");
    }

    private static void writeTcp(JSONObject config, byte[] bytes) throws PrinterException {
        String host = config.optString("host").trim();
        int port = config.optInt("port", 9100);
        if (host.isEmpty() || port < 1 || port > 65_535) {
            throw new PrinterException("UNSUPPORTED_PRINTER", "Invalid network printer");
        }
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), TIMEOUT_MS);
            socket.setSoTimeout(TIMEOUT_MS);
            try (OutputStream output = socket.getOutputStream()) {
                output.write(bytes);
                output.flush();
            }
        } catch (java.net.SocketTimeoutException exception) {
            throw new PrinterException("PRINT_TIMEOUT", "Printer timed out", exception);
        } catch (Exception exception) {
            throw new PrinterException("CONNECTION_FAILED", "Could not connect to printer", exception);
        }
    }

    private static void writeBluetooth(Context context, JSONObject config, byte[] bytes) throws PrinterException {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            throw new PrinterException("PERMISSION_DENIED", "Bluetooth permission is required");
        }
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null || !adapter.isEnabled()) {
            throw new PrinterException("PRINTER_OFFLINE", "Bluetooth is unavailable");
        }
        BluetoothSocket socket = null;
        try {
            BluetoothDevice device = adapter.getRemoteDevice(config.optString("deviceRef"));
            socket = device.createRfcommSocketToServiceRecord(SERIAL_PORT);
            adapter.cancelDiscovery();
            socket.connect();
            OutputStream output = socket.getOutputStream();
            output.write(bytes);
            output.flush();
            output.close();
        } catch (SecurityException exception) {
            throw new PrinterException("PERMISSION_DENIED", "Bluetooth permission is required", exception);
        } catch (Exception exception) {
            throw new PrinterException("CONNECTION_FAILED", "Could not connect to printer", exception);
        } finally {
            if (socket != null) {
                try { socket.close(); } catch (Exception ignored) { }
            }
        }
    }

    static final class PrinterException extends Exception {
        final String code;

        PrinterException(String code, String message) {
            super(message);
            this.code = code;
        }

        PrinterException(String code, String message, Throwable cause) {
            super(message, cause);
            this.code = code;
        }
    }
}
