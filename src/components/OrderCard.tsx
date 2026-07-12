import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import { callOutline, chatbubbleEllipsesOutline, openOutline } from 'ionicons/icons';
import type { CSSProperties } from 'react';
import type { Order } from '../types';
import { getKanbanGroup, getKanbanSubState } from '../services/apiMock';

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
  onChat?: () => void;
  style?: CSSProperties;
}

export function OrderCard({ order, onClick, onChat, style }: OrderCardProps) {
  const { t } = useTranslation();
  const group = getKanbanGroup(order.status);
  const subState = getKanbanSubState(order);
  const item = order.items[0];
  const fallbackPhones: Record<string, string> = {
    'customers.lucia': '+51999888777',
    'customers.carlos': '+51912345678',
    'customers.pedro': '+51955111222',
    'customers.ana': '+51988777666',
  };
  const phone = order.phone ?? fallbackPhones[order.customerKey] ?? '+51900000000';

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
    <article className={cardClass} style={style}>
      <div className="order-id">#{order.id}</div>
      <div className="order-customer">{t(order.customerKey)}</div>
      <div className="order-detail">{detail}</div>
      <div className="order-footer">
        <span className="order-price">S/ {order.total.toFixed(2)}</span>
        <span className={`ag-pill ${pillClass}`}>{t(`ops.subStates.${subState}`)}</span>
      </div>
      <div className="order-card-actions">
        <button type="button" onClick={onClick}><IonIcon icon={openOutline} />{t('orders.openStatus')}</button>
        <button type="button" onClick={onChat}><IonIcon icon={chatbubbleEllipsesOutline} />{t('orders.openChat')}</button>
        <a href={`tel:${phone}`}><IonIcon icon={callOutline} />{t('orders.call')}</a>
      </div>
    </article>
  );
}
