import { useTranslation } from 'react-i18next';
import type { CSSProperties } from 'react';
import type { Order } from '../types';

interface KitchenOrderCardProps {
  order: Order;
  onAction: () => void;
  style?: CSSProperties;
}

export function KitchenOrderCard({ order, onAction, style }: KitchenOrderCardProps) {
  const { t } = useTranslation();
  const isCooking = order.status === 'in_kitchen';
  const isReady = order.status === 'ready';

  const cardClass = isReady
    ? 'kitchen-card kitchen-card--ready ag-enter'
    : isCooking
      ? 'kitchen-card kitchen-card--cooking ag-enter'
      : 'kitchen-card ag-enter';

  const ctaClass = isReady ? 'kitchen-cta kitchen-cta--ready' : 'kitchen-cta kitchen-cta--cook';
  const ctaLabel = isReady
    ? t('kitchen.handOff')
    : isCooking
      ? t('kitchen.markReady')
      : t('kitchen.startCooking');

  return (
    <article className={cardClass} style={style}>
      <div className="kitchen-card-top">
        <div className="order-id">#{order.id}</div>
        {isCooking ? (
          <div className={`kitchen-timer${(order.minutesInKitchen ?? 0) > 15 ? '' : ' kitchen-timer--ok'}`}>
            {t('kitchen.minutes', { count: order.minutesInKitchen ?? 0 })}
          </div>
        ) : null}
      </div>
      <div className="order-customer">{t(order.customerKey)}</div>
      <ul className="kitchen-items">
        {order.items.map((item, idx) => (
          <li key={idx}>
            <strong>{item.qty}×</strong> {t(item.nameKey)}
          </li>
        ))}
      </ul>
      <button type="button" className={ctaClass} onClick={onAction}>
        {ctaLabel}
      </button>
    </article>
  );
}
