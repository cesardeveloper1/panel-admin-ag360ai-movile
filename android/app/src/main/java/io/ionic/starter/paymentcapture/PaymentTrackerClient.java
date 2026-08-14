package io.ionic.starter.paymentcapture;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

final class PaymentTrackerClient {
    private static final int CONNECT_TIMEOUT_MILLIS = 8_000;
    private static final int READ_TIMEOUT_MILLIS = 12_000;

    private PaymentTrackerClient() {}

    static Response exchangeTicket(
        String trackerBaseUrl,
        String ticket,
        PaymentDeviceStore.Identity identity
    ) throws Exception {
        JSONObject body = new JSONObject();
        body.put("ticket", ticket);
        body.put("installationId", identity.installationId);
        body.put("publicKey", identity.publicKey);
        body.put("platform", "android");
        String baseUrl = PaymentDeviceStore.validateTrackerBaseUrl(trackerBaseUrl);
        return post(baseUrl + "/api/device-pairings/exchange", null, null, body);
    }

    static Response ingest(
        PaymentDeviceStore.DeviceCredential credential,
        String idempotencyKey,
        JSONObject event
    ) throws Exception {
        return post(
            credential.trackerBaseUrl + "/api/payment-events/v1",
            credential.token,
            idempotencyKey,
            event
        );
    }

    static Response revoke(PaymentDeviceStore.DeviceCredential credential) throws Exception {
        return post(
            credential.trackerBaseUrl + "/api/devices/self/revoke",
            credential.token,
            null,
            new JSONObject()
        );
    }

    private static Response post(
        String url,
        String token,
        String idempotencyKey,
        JSONObject body
    ) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        try {
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(CONNECT_TIMEOUT_MILLIS);
            connection.setReadTimeout(READ_TIMEOUT_MILLIS);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Accept", "application/json");
            if (token != null) connection.setRequestProperty("Authorization", "Bearer " + token);
            if (idempotencyKey != null) connection.setRequestProperty("Idempotency-Key", idempotencyKey);
            byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
            connection.setFixedLengthStreamingMode(payload.length);
            connection.getOutputStream().write(payload);

            int status = connection.getResponseCode();
            InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
            String raw = readBody(stream);
            JSONObject responseBody = raw.isEmpty() ? new JSONObject() : new JSONObject(raw);
            return new Response(status, responseBody);
        } finally {
            connection.disconnect();
        }
    }

    private static String readBody(InputStream stream) throws Exception {
        if (stream == null) return "";
        StringBuilder result = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) result.append(line);
        }
        return result.toString();
    }

    static final class Response {
        final int status;
        final JSONObject body;

        Response(int status, JSONObject body) {
            this.status = status;
            this.body = body;
        }

        boolean isSuccess() {
            return status >= 200 && status < 300;
        }
    }
}
