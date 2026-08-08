# PRP 010 — Reportes desde Dashboard OrderFood (ssgg)

> **Version:** 1.0  
> **Created:** 2026-08-08  
> **Status:** Completed  
> **Epic:** [README-ssgg-connection](./README-ssgg-connection.md)  
> **Depends on:** 007 (API + auth), 008 (marca con `subdomain`)

---

## Goal

Que la pantalla **Reportes** del móvil consuma el mismo endpoint que el **Dashboard de Ventas** del panel web (`GET /dashboard/orderfood`), con mapper a `DashboardReport` y flag mock.

## What

1. `dashboardService` → `/dashboard/orderfood?dateFrom&dateTo&restaurant=<subdomain>` (+ conversaciones opcionales).
2. `mapDashboardFromApi` → KPIs, canales, rankings, pagos, reservas, conectividad.
3. `apiFacade.getDashboard` (mock vs real).
4. `ReportsPage` deja de llamar `apiMock` directo.
5. **ssgg:** roles del endpoint amplían a `OWNER` / `MANAGER` / `WORKER` (antes solo `SUPERADMIN`).

### Success Criteria

- [x] Mock on: reportes demo sin cambio de UX
- [x] Mock off: ventas/pedidos/ticket reales de la marca
- [x] Hoy y rango de fechas disparan query `dateFrom`/`dateTo`
- [x] Insights fake (quejas/delivery %) removidos; solo datos API

## Notes

- Métodos de pago: conteos Artemis (`paymentMethodChoiceCounts`), no montos.
- `restaurant=all` no se usa en móvil; siempre subdomain de la marca activa.
- Reiniciar `ssgg` tras el cambio de roles.
