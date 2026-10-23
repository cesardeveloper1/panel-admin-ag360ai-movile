import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import { callOutline, chatbubbleEllipsesOutline, openOutline } from 'ionicons/icons';
import type { CSSProperties } from 'react';
import type { Order } from '../types';
import { getKanbanGroup, getKanbanSubState } from '../utils/orderKanban';

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
  const phone = order.phone?.trim() || '';
  const displayPhone = phone.replace(/^(\+51)(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3 $4');

  const primaryAction: 'chat' | 'status' | null =
    group === 'delivered'
      ? null
      : order.needsHuman
        ? 'chat'
        : 'status';

  const cardClass =
    group === 'processing'
      ? 'order-card order-card--hot'
      : group === 'delivered'
        ? 'order-card order-card--done'
        : 'order-card order-card--new';

  return (
    <article className={cardClass} style={style}>
      <div className="order-customer-row">
        <div className="order-customer-identity">
          <div className="order-customer">{order.customerName ?? t(order.customerKey)}</div>
          <span>{displayPhone || t('ops.reliability.noInformation')}</span>
        </div>
        <div className="order-card__meta">
          <span className={`order-card__state-badge order-card__state-badge--${group ?? 'new'}`}>
            {t(`ops.subStates.${subState}`)}
          </span>
          {order.leadTag ? (
            <span className={`order-lead-tag order-lead-tag--${order.leadTag}`}>
              {t(`orders.lead.${order.leadTag}`)}
            </span>
          ) : null}
        </div>
      </div>
      <div className="order-card-actions">
        <button
          type="button"
          className={primaryAction === 'status' ? 'is-primary' : undefined}
          onClick={onClick}
        >
          <IonIcon icon={openOutline} aria-hidden="true" />
          {t('orders.openStatus')}
        </button>
        <button
          type="button"
          className={primaryAction === 'chat' ? 'is-primary' : undefined}
          onClick={onChat}
        >
          <IonIcon icon={chatbubbleEllipsesOutline} aria-hidden="true" />
          {t('orders.openChat')}
        </button>
        {phone ? <a href={`tel:${phone}`}>
          <IonIcon icon={callOutline} aria-hidden="true" />
          {t('orders.call')}
        </a> : null}
      </div>
    </article>
  );
}
