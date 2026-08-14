package io.ionic.starter.paymentcapture;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public class YapeNotificationParserTest {
    @Test
    public void parsesSolesIntoMinorUnits() {
        YapeNotificationParser.ParsedPayment payment = YapeNotificationParser.parse(
            "Recibiste un yapeo",
            "Recibiste S/ 25.50"
        );
        assertEquals(2550, payment.amountMinor);
    }

    @Test
    public void acceptsCommaDecimals() {
        YapeNotificationParser.ParsedPayment payment = YapeNotificationParser.parse("Yape", "PEN 10,5");
        assertEquals(1050, payment.amountMinor);
    }

    @Test
    public void rejectsPayloadWithoutAnAmount() {
        assertNull(YapeNotificationParser.parse("Yape", "Pago recibido"));
    }
}
