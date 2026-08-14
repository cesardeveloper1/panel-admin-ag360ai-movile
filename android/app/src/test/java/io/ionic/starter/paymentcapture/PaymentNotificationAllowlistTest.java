package io.ionic.starter.paymentcapture;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class PaymentNotificationAllowlistTest {
    @Test
    public void acceptsOnlyTheExactYapePackage() {
        assertTrue(PaymentNotificationAllowlist.contains("com.bcp.innovacxion.yapeapp"));
        assertFalse(PaymentNotificationAllowlist.contains("com.bcp.innovacxion.yapeapp.fake"));
        assertFalse(PaymentNotificationAllowlist.contains("com.whatsapp"));
        assertFalse(PaymentNotificationAllowlist.contains(null));
    }
}
