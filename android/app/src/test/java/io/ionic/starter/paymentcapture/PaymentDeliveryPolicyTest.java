package io.ionic.starter.paymentcapture;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class PaymentDeliveryPolicyTest {
    @Test
    public void classifiesTerminalAndRetryableResponses() {
        assertEquals(PaymentDeliveryPolicy.Outcome.ACK, PaymentDeliveryPolicy.classify(201));
        assertEquals(PaymentDeliveryPolicy.Outcome.ACK, PaymentDeliveryPolicy.classify(409));
        assertEquals(PaymentDeliveryPolicy.Outcome.BLOCK, PaymentDeliveryPolicy.classify(401));
        assertEquals(PaymentDeliveryPolicy.Outcome.DEAD_LETTER, PaymentDeliveryPolicy.classify(422));
        assertEquals(PaymentDeliveryPolicy.Outcome.RETRY, PaymentDeliveryPolicy.classify(429));
        assertEquals(PaymentDeliveryPolicy.Outcome.RETRY, PaymentDeliveryPolicy.classify(503));
    }

    @Test
    public void backoffGrowsAndIsCapped() {
        long first = PaymentDeliveryPolicy.retryDelayMillis(0, "event-a");
        long later = PaymentDeliveryPolicy.retryDelayMillis(4, "event-a");
        long capped = PaymentDeliveryPolicy.retryDelayMillis(100, "event-a");
        assertTrue(first >= 10_000L);
        assertTrue(later > first);
        assertTrue(capped <= 15 * 60_000L);
    }
}
