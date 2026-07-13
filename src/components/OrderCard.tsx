import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import { callOutline, chatbubbleEllipsesOutline, openOutline } from 'ionicons/icons';
import type { CSSProperties } from 'react';
import type { Order } from '../types';
import { getKanbanGroup } from '../services/apiMock';

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
  onChat?: () => void;
  style?: CSSProperties;
}

export function OrderCard({ order, onClick, onChat, style }: OrderCardProps) {
  const { t } = useTranslation();
  const group = getKanbanGroup(order.status);
  const fallbackPhones: Record<string, string> = {
    'customers.lucia': '+51999888777',
    'customers.carlos': '+51912345678',
    'customers.pedro': '+51955111222',
    'customers.ana': '+51988777666',
  };
  const phone = order.phone ?? fallbackPhones[order.customerKey] ?? '+51900000000';
  const displayPhone = phone.replace(/^(\+51)(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3 $4');

  const cardClass =
    group === 'processing'
      ? 'order-card order-card--hot ag-enter'
      : group === 'delivered'
        ? 'order-card order-card--done ag-enter'
        : 'order-card order-card--new ag-enter';

  return (
    <article className={cardClass} style={style}>
      <div className="order-customer-row">
        <div className="order-customer-identity"><div className="order-customer">{order.customerName ?? t(order.customerKey)}</div><span>{displayPhone}</span></div>
        {order.leadTag ? <span className={`order-lead-tag order-lead-tag--${order.leadTag}`}>{t(`orders.lead.${order.leadTag}`)}</span> : null}
      </div>
      <div className="order-card-actions">
        <button type="button" onClick={onClick}><IonIcon icon={openOutline} />{t('orders.openStatus')}</button>
        <button type="button" onClick={onChat}><IonIcon icon={chatbubbleEllipsesOutline} />{t('orders.openChat')}</button>
        <a href={`tel:${phone}`}><IonIcon icon={callOutline} />{t('orders.call')}</a>
      </div>
    </article>
  );
}
