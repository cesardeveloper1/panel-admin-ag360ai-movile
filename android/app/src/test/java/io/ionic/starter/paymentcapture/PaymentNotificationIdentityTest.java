package io.ionic.starter.paymentcapture;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;

import org.junit.Test;

public class PaymentNotificationIdentityTest {
    @Test
    public void normalizesWhitespaceBeforeHashing() throws Exception {
        assertEquals(
            PaymentNotificationIdentity.contentHash(" Pago recibido ", " S/ 25.00 "),
            PaymentNotificationIdentity.contentHash("Pago recibido", "S/ 25.00")
        );
    }

    @Test
    public void stableKeyIsDeterministicAndSeparatesEvents() throws Exception {
        String contentHash = PaymentNotificationIdentity.contentHash("Pago recibido", "S/ 25.00");
        String first = PaymentNotificationIdentity.stableKey("yape", "notification-key", 100L, contentHash);
        String duplicate = PaymentNotificationIdentity.stableKey("yape", "notification-key", 100L, contentHash);
        String later = PaymentNotificationIdentity.stableKey("yape", "notification-key", 101L, contentHash);

        assertEquals(first, duplicate);
        assertNotEquals(first, later);
    }
}
