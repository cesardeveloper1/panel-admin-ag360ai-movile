import { describe, expect, it } from 'vitest';
import { mapDashboardFromApi } from './dashboardMapper';

describe('mapDashboardFromApi', () => {
  it('mapea KPIs y canales desde payload OrderFood', () => {
    const report = mapDashboardFromApi(
      {
        metadata: {
          currencies: [{ code: 'PEN', symbol: 'S/', name: 'Sol' }],
        },
        salesMetrics: {
          totalSales: 3842,
          totalOrders: 19,
          averageTicket: 81.7,
          paymentMethodChoiceCounts: { yape: 4, efectivo: 2 },
          growth: { sales: 12, orders: 5, customers: 3 },
        },
        channelMetrics: {
          chatbot: {
            sales: 3000,
            orders: 15,
            conversionRate: 34,
            conversationsTotal: 128,
            repurchaseRate: 22,
            ordersWithoutHuman: 14,
          },
          cartaDigital: { sales: 842, orders: 4, conversionRate: 10 },
        },
        rankings: {
          restaurants: [{ id: '1', name: 'Miraflores', sales: 2000, orders: 10, growth: 5 }],
          products: [{ id: 'p1', name: 'Smash', sales: 500, orders: 8, category: 'Burgers' }],
        },
        charts: {
          salesTrend: [
            { name: '07/08', ventas: 1000, ordenes: 5 },
            { name: '08/08', ventas: 2842, ordenes: 14 },
          ],
        },
        reservationMetrics: {
          totalReservations: 18,
          confirmed: 14,
          cancelled: 2,
          totalGuests: 52,
          cancellationRate: 8,
        },
      },
      { period: 'today', conversationsTotal: 130 },
    );

    expect(report.currencySymbol).toBe('S/');
    expect(report.kpis.find((k) => k.id === 'sales')?.value).toBe(3842);
    expect(report.kpis.find((k) => k.id === 'orders')?.value).toBe(19);
    expect(report.channelMetrics.conversations).toBe(130);
    expect(report.channelMetrics.conversionPct).toBe(34);
    expect(report.channelMetrics.repurchasePct).toBe(22);
    expect(report.paymentMethods[0]?.id).toBe('yape');
    expect(report.restaurantRanking[0]?.nameKey).toBe('Miraflores');
    expect(report.salesTrend).toHaveLength(2);
    expect(report.reservations.total).toBe(18);
  });
});
