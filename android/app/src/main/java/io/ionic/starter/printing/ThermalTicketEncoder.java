package io.ionic.starter.printing;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.nio.charset.Charset;
import java.util.Locale;

final class ThermalTicketEncoder {
    private static final Charset PRINTER_CHARSET = Charset.forName("CP850");

    static byte[] testTicket(JSONObject config) {
        ByteArrayOutputStream output = start();
        line(output, center("AGILIZA360", columns(config)));
        line(output, center("IMPRESORA CONFIGURADA", columns(config)));
        divider(output, columns(config));
        line(output, "Conexion: " + config.optString("transport"));
        line(output, "Papel: " + config.optInt("paperWidthMm", 80) + " mm");
        line(output, new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US).format(new java.util.Date()));
        finish(output);
        return output.toByteArray();
    }

    static byte[] orderTicket(JSONObject payload, JSONObject config, String ticketType) {
        int columns = columns(config);
        ByteArrayOutputStream output = start();
        boolean kitchen = "kitchen".equals(ticketType);
        JSONObject ticketConfig = typeConfig(payload, ticketType);
        JSONObject customerConfig = ticketConfig == null ? null : ticketConfig.optJSONObject("customer");
        JSONObject itemsConfig = ticketConfig == null ? null : ticketConfig.optJSONObject("items");
        JSONObject totalsConfig = ticketConfig == null ? null : ticketConfig.optJSONObject("totals");
        JSONObject paymentConfig = ticketConfig == null ? null : ticketConfig.optJSONObject("payment");
        JSONObject notesConfig = ticketConfig == null ? null : ticketConfig.optJSONObject("notes");
        boolean showCustomer = configured(customerConfig, "visible", !kitchen);
        boolean showPrices = configured(itemsConfig, "showPrices", !kitchen);

        if (configured(ticketConfig, "showHeader", true)) {
            String defaultHeader = kitchen ? "COCINA" : value(payload, "brandName", "PEDIDO");
            line(output, center(configuredText(ticketConfig, "headerTitle", defaultHeader), columns));
        }
        if (configured(ticketConfig, "showOrderNumber", true)) {
            line(output, center("#" + value(payload, "orderNumber", payload.optString("orderId")), columns));
        }
        if (configured(ticketConfig, "showOrderId", false)) {
            line(output, center("ID " + payload.optString("orderId"), columns));
        }
        line(output, center(payload.optString("statusLabel"), columns));
        divider(output, columns);
        if (showCustomer) {
            optional(output, "Cliente: ", payload.optString("customerName"));
            if (configured(customerConfig, "showPhone", !kitchen)) {
                optional(output, "Telefono: ", payload.optString("customerPhone"));
            }
            if (configured(customerConfig, "showAddress", !kitchen)) {
                optional(output, "Direccion: ", payload.optString("deliveryAddress"));
                optional(output, "Referencia: ", payload.optString("deliveryAddressRef"));
            }
            divider(output, columns);
        }
        if (configured(ticketConfig, "showDeliveryMode", true)) {
            optional(output, "Entrega: ", payload.optString("deliveryMode"));
        }
        JSONArray items = payload.optJSONArray("items");
        if (items != null) {
            for (int index = 0; index < items.length(); index += 1) {
                JSONObject item = items.optJSONObject(index);
                if (item == null) continue;
                line(output, item.optInt("quantity", 1) + " x " + item.optString("name"));
                JSONArray modifiers = item.optJSONArray("modifiers");
                if (modifiers != null) {
                    for (int modifierIndex = 0; modifierIndex < modifiers.length(); modifierIndex += 1) {
                        line(output, "  + " + modifiers.optString(modifierIndex));
                    }
                }
                optional(output, "  Nota: ", item.optString("notes"));
                if (showPrices && item.has("lineTotal")) {
                    line(output, right(money(payload, item.optDouble("lineTotal")), columns));
                }
            }
        }
        divider(output, columns);
        if (configured(notesConfig, "visible", true)) {
            optional(output, "Notas: ", payload.optString("specialNotes"));
        }
        if (configured(totalsConfig, "visible", !kitchen)) {
            if (payload.has("productsSubtotal")) line(output, pair("Subtotal", money(payload, payload.optDouble("productsSubtotal")), columns));
            if (payload.has("deliveryCost")) line(output, pair("Envio", money(payload, payload.optDouble("deliveryCost")), columns));
            if (payload.has("discountAmount") && payload.optDouble("discountAmount") > 0) line(output, pair("Descuento", "-" + money(payload, payload.optDouble("discountAmount")), columns));
            if (payload.has("total")) line(output, pair("TOTAL", money(payload, payload.optDouble("total")), columns));
        }
        if (configured(paymentConfig, "visible", !kitchen)) {
            optional(output, "Pago: ", payload.optString("paymentLabel"));
        }
        if (configured(ticketConfig, "showFooter", false)) {
            optional(output, "", ticketConfig.optString("footerLine1"));
            optional(output, "", ticketConfig.optString("footerLine2"));
        }
        finish(output);
        return output.toByteArray();
    }

    private static ByteArrayOutputStream start() {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        output.write(0x1B); output.write(0x40);
        output.write(0x1B); output.write(0x74); output.write(0x02);
        return output;
    }

    private static void finish(ByteArrayOutputStream output) {
        line(output, ""); line(output, ""); line(output, "");
        output.write(0x1D); output.write(0x56); output.write(0x41); output.write(0x10);
    }

    private static int columns(JSONObject config) {
        return config.optInt("paperWidthMm", 80) == 58 ? 32 : 48;
    }

    private static JSONObject typeConfig(JSONObject payload, String ticketType) {
        JSONObject root = payload.optJSONObject("ticketConfig");
        return root == null ? null : root.optJSONObject(ticketType);
    }

    private static boolean configured(JSONObject config, String key, boolean fallback) {
        return config == null ? fallback : config.optBoolean(key, fallback);
    }

    private static String configuredText(JSONObject config, String key, String fallback) {
        if (config == null) return fallback;
        String value = config.optString(key).trim();
        return value.isEmpty() ? fallback : value;
    }

    private static void divider(ByteArrayOutputStream output, int columns) {
        line(output, repeat('-', columns));
    }

    private static void optional(ByteArrayOutputStream output, String prefix, String value) {
        if (value != null && !value.trim().isEmpty()) line(output, prefix + value.trim());
    }

    private static void line(ByteArrayOutputStream output, String value) {
        byte[] encoded = sanitize(value).getBytes(PRINTER_CHARSET);
        output.write(encoded, 0, encoded.length);
        output.write('\n');
    }

    private static String sanitize(String value) {
        return value == null ? "" : value.replace('\r', ' ').replace('\n', ' ');
    }

    private static String value(JSONObject payload, String key, String fallback) {
        String value = payload.optString(key).trim();
        return value.isEmpty() ? fallback : value;
    }

    private static String money(JSONObject payload, double value) {
        return payload.optString("currencySymbol", "S/") + " " + String.format(Locale.US, "%.2f", value);
    }

    private static String pair(String left, String right, int columns) {
        int spaces = Math.max(1, columns - left.length() - right.length());
        return left + repeat(' ', spaces) + right;
    }

    private static String center(String value, int columns) {
        String trimmed = sanitize(value);
        if (trimmed.length() >= columns) return trimmed;
        return repeat(' ', (columns - trimmed.length()) / 2) + trimmed;
    }

    private static String right(String value, int columns) {
        return repeat(' ', Math.max(0, columns - value.length())) + value;
    }

    private static String repeat(char value, int count) {
        StringBuilder result = new StringBuilder(Math.max(0, count));
        for (int index = 0; index < count; index += 1) result.append(value);
        return result.toString();
    }
}
