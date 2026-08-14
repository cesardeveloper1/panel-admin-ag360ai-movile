package io.ionic.starter.paymentcapture;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONObject;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.spec.ECGenParameterSpec;
import java.time.Instant;
import java.net.URI;
import java.util.UUID;

final class PaymentDeviceStore {
    private static final String PREFERENCES = "payment_device_binding_v1";
    private static final String IDENTITY_ALIAS = "agiliza_payment_device_identity_v1";
    private static final String INSTALLATION_ID = "installation_id";
    private static final String CREDENTIAL = "encrypted_credential";
    private static final String STATE = "binding_state";
    private static final String LAST_ACK_AT = "last_ack_at";
    private static final String LAST_ERROR_CODE = "last_delivery_error_code";

    private final SharedPreferences preferences;

    PaymentDeviceStore(Context context) {
        preferences = context.getApplicationContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }

    synchronized Identity getOrCreateIdentity() throws Exception {
        String installationId = preferences.getString(INSTALLATION_ID, null);
        if (installationId == null) {
            installationId = UUID.randomUUID().toString();
            preferences.edit().putString(INSTALLATION_ID, installationId).commit();
        }
        KeyPair keyPair = getOrCreateIdentityKeyPair();
        return new Identity(
            installationId,
            Base64.encodeToString(keyPair.getPublic().getEncoded(), Base64.NO_WRAP)
        );
    }

    synchronized void saveCredential(DeviceCredential credential) throws Exception {
        JSONObject payload = new JSONObject();
        payload.put("deviceId", credential.deviceId);
        payload.put("token", credential.token);
        payload.put("trackerBaseUrl", validateTrackerBaseUrl(credential.trackerBaseUrl));
        payload.put("branchId", credential.branchId);
        payload.put("branchName", credential.branchName);
        payload.put("expiresAt", credential.expiresAt);
        payload.put("providers", new JSONArray(credential.providers));
        preferences.edit()
            .putString(CREDENTIAL, PaymentCrypto.encrypt(payload.toString()))
            .putString(STATE, "linked")
            .remove(LAST_ERROR_CODE)
            .commit();
    }

    synchronized DeviceCredential getCredential() {
        String encrypted = preferences.getString(CREDENTIAL, null);
        if (encrypted == null) return null;
        try {
            JSONObject payload = new JSONObject(PaymentCrypto.decrypt(encrypted));
            JSONArray providersJson = payload.optJSONArray("providers");
            String[] providers = new String[providersJson == null ? 0 : providersJson.length()];
            for (int index = 0; index < providers.length; index += 1) {
                providers[index] = providersJson.optString(index);
            }
            return new DeviceCredential(
                payload.getString("deviceId"),
                payload.getString("token"),
                payload.getString("trackerBaseUrl"),
                payload.optString("branchId"),
                payload.optString("branchName"),
                payload.optString("expiresAt"),
                providers
            );
        } catch (Exception exception) {
            block("DEVICE_CREDENTIAL_UNREADABLE");
            return null;
        }
    }

    boolean isLinked() {
        return "linked".equals(preferences.getString(STATE, "unlinked")) && getCredential() != null;
    }

    boolean canCapture() {
        return isLinked();
    }

    void requestUnlink() {
        preferences.edit().putString(STATE, "unlink_pending").commit();
    }

    boolean isUnlinkPending() {
        return "unlink_pending".equals(preferences.getString(STATE, "unlinked"));
    }

    void block(String errorCode) {
        preferences.edit().putString(STATE, "blocked").putString(LAST_ERROR_CODE, errorCode).commit();
    }

    void clearCredential() {
        preferences.edit().remove(CREDENTIAL).putString(STATE, "unlinked").remove(LAST_ERROR_CODE).commit();
    }

    void markAck() {
        preferences.edit()
            .putString(LAST_ACK_AT, Instant.now().toString())
            .remove(LAST_ERROR_CODE)
            .apply();
    }

    void markDeliveryError(String errorCode) {
        preferences.edit().putString(LAST_ERROR_CODE, errorCode).apply();
    }

    String getState() {
        return preferences.getString(STATE, "unlinked");
    }

    String getLastAckAt() {
        return preferences.getString(LAST_ACK_AT, null);
    }

    String getLastErrorCode() {
        return preferences.getString(LAST_ERROR_CODE, null);
    }

    static String validateTrackerBaseUrl(String value) {
        String trimmed = value == null ? "" : value.trim();
        while (trimmed.endsWith("/")) trimmed = trimmed.substring(0, trimmed.length() - 1);
        URI uri;
        try {
            uri = URI.create(trimmed);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("TRACKER_URL_INVALID");
        }
        String scheme = uri.getScheme();
        String host = uri.getHost();
        boolean localDevelopment = "http".equalsIgnoreCase(scheme)
            && ("10.0.2.2".equals(host) || "localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host));
        boolean secureRemote = "https".equalsIgnoreCase(scheme) && host != null;
        if ((!localDevelopment && !secureRemote) || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null) {
            throw new IllegalArgumentException("TRACKER_URL_REQUIRES_TLS");
        }
        return trimmed;
    }

    private static KeyPair getOrCreateIdentityKeyPair() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        if (keyStore.containsAlias(IDENTITY_ALIAS)) {
            KeyStore.PrivateKeyEntry entry = (KeyStore.PrivateKeyEntry) keyStore.getEntry(IDENTITY_ALIAS, null);
            return new KeyPair(entry.getCertificate().getPublicKey(), entry.getPrivateKey());
        }

        KeyPairGenerator generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore");
        generator.initialize(
            new KeyGenParameterSpec.Builder(
                IDENTITY_ALIAS,
                KeyProperties.PURPOSE_SIGN | KeyProperties.PURPOSE_VERIFY
            )
                .setAlgorithmParameterSpec(new ECGenParameterSpec("secp256r1"))
                .setDigests(KeyProperties.DIGEST_SHA256)
                .build()
        );
        return generator.generateKeyPair();
    }

    static final class Identity {
        final String installationId;
        final String publicKey;

        Identity(String installationId, String publicKey) {
            this.installationId = installationId;
            this.publicKey = publicKey;
        }
    }

    static final class DeviceCredential {
        final String deviceId;
        final String token;
        final String trackerBaseUrl;
        final String branchId;
        final String branchName;
        final String expiresAt;
        final String[] providers;

        DeviceCredential(
            String deviceId,
            String token,
            String trackerBaseUrl,
            String branchId,
            String branchName,
            String expiresAt,
            String[] providers
        ) {
            this.deviceId = deviceId;
            this.token = token;
            this.trackerBaseUrl = trackerBaseUrl;
            this.branchId = branchId;
            this.branchName = branchName;
            this.expiresAt = expiresAt;
            this.providers = providers;
        }
    }
}
