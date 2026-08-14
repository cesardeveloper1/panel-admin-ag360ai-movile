package io.ionic.starter.paymentcapture;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class YapeNotificationParser {
    private static final Pattern AMOUNT_PATTERN = Pattern.compile(
        "(?:S/|PEN)\\s*([0-9]{1,9}(?:[.,][0-9]{1,2})?)",
        Pattern.CASE_INSENSITIVE
    );

    private YapeNotificationParser() {}

    static ParsedPayment parse(String title, String body) {
        String combined = PaymentNotificationIdentity.normalize(title)
            + "\n"
            + PaymentNotificationIdentity.normalize(body);
        Matcher matcher = AMOUNT_PATTERN.matcher(combined);
        if (!matcher.find()) return null;
        try {
            BigDecimal amount = new BigDecimal(matcher.group(1).replace(',', '.'));
            int amountMinor = amount.movePointRight(2).setScale(0, RoundingMode.UNNECESSARY).intValueExact();
            if (amountMinor <= 0) return null;
            return new ParsedPayment(amountMinor);
        } catch (ArithmeticException exception) {
            return null;
        }
    }

    static final class ParsedPayment {
        final int amountMinor;

        ParsedPayment(int amountMinor) {
            this.amountMinor = amountMinor;
        }
    }
}
