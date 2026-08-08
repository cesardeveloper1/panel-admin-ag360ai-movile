export type ActiveBrandContext = {
  brandId: string | null;
  brandSubdomain: string | null;
};

export type OrderSocketEventShape = {
  type?: string;
  brandId?: string;
  brandKey?: string;
  data?: {
    brandSubdomain?: string;
    orderNumber?: string;
    status?: string;
    _id?: string;
    orderId?: string;
  };
};

/**
 * true si el evento pertenece a la marca activa (misma lógica que el panel web).
 */
export function orderSocketEventMatchesBrand(
  event: OrderSocketEventShape,
  active: ActiveBrandContext,
): boolean {
  if (!active.brandId && !active.brandSubdomain) return false;

  if (active.brandId && event.brandId?.trim() === active.brandId.trim()) return true;
  if (active.brandSubdomain && event.brandKey === active.brandSubdomain) return true;
  if (active.brandSubdomain && event.data?.brandSubdomain === active.brandSubdomain) {
    return true;
  }

  return false;
}
