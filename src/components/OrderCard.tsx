import { useTranslation } from 'react-i18next';
import type { CSSProperties } from 'react';
import type { Order } from '../types';
import { getKanbanGroup, getKanbanSubState } from '../services/apiMock';

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
  style?: CSSProperties;
}

export function OrderCard({ order, onClick, style }: OrderCardProps) {
  const { t } = useTranslation();
  const group = getKanbanGroup(order.status);
  const subState = getKanbanSubState(order);
  const item = order.items[0];

  const pillClass =
    group === 'processing' ? 'ag-pill--hot' : group === 'delivered' ? 'ag-pill--done' : 'ag-pill--new';
  const cardClass =
    group === 'processing'
      ? 'order-card order-card--hot ag-enter'
      : group === 'delivered'
        ? 'order-card order-card--done ag-enter'
        : 'order-card order-card--new ag-enter';

  const detail =
    order.status === 'on_the_way'
      ? t('orders.motorized')
      : t('orders.detail', {
          qty: item.qty,
          product: t(item.nameKey),
          delivery: t(`orders.${order.deliveryType}`),
          channel: t(`orders.channel.${order.channel}`),
        });

  return (
    <article
      className={cardClass}
      style={style}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      role="button"
      tabIndex={0}
    >
      <div className="order-id">#{order.id}</div>
      <div className="order-customer">{t(order.customerKey)}</div>
      <div className="order-detail">{detail}</div>
      <div className="order-footer">
        <span className="order-price">S/ {order.total.toFixed(2)}</span>
        <span className={`ag-pill ${pillClass}`}>{t(`ops.subStates.${subState}`)}</span>
      </div>
    </article>
  );
}
