package io.ionic.starter.paymentcapture;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;

import org.junit.Test;

public class PaymentDeviceStoreTest {
    @Test
    public void acceptsHttpsAndExplicitEmulatorHost() {
        assertEquals("https://tracker.example.com", PaymentDeviceStore.validateTrackerBaseUrl("https://tracker.example.com/"));
        assertEquals("http://10.0.2.2:5000", PaymentDeviceStore.validateTrackerBaseUrl("http://10.0.2.2:5000"));
    }

    @Test
    public void rejectsPlainRemoteAndLookalikeHosts() {
        assertThrows(
            IllegalArgumentException.class,
            () -> PaymentDeviceStore.validateTrackerBaseUrl("http://tracker.example.com")
        );
        assertThrows(
            IllegalArgumentException.class,
            () -> PaymentDeviceStore.validateTrackerBaseUrl("http://10.0.2.2.evil.example")
        );
    }
}
