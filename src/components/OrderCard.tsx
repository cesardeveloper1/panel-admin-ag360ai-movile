import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import { callOutline, chatbubbleEllipsesOutline, openOutline } from 'ionicons/icons';
import type { CSSProperties } from 'react';
import type { Brand, Order } from '../types';
import { getKanbanGroup, getKanbanSubState } from '../utils/orderKanban';
import { nextOrderAction, type OrderActionResult, type OrderMutation } from '../utils/orderActions';
import { orderAmount, orderCreatedTime } from '../utils/orderPresentation';

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
  onChat?: () => void;
  onAdvance?: () => Promise<OrderActionResult>;
  canChangeStatus?: boolean;
  mutation?: OrderMutation;
  brand?: Brand | null;
  showBranch?: boolean;
  style?: CSSProperties;
}

export function OrderCard({ order, onClick, onChat, onAdvance, canChangeStatus = false, mutation, brand = null, showBranch = false, style }: OrderCardProps) {
  const { t, i18n } = useTranslation();
  const group = getKanbanGroup(order.status);
  const phone = order.phone?.trim();
  const action = nextOrderAction(order, canChangeStatus);
  const createdTime = orderCreatedTime(order, brand, i18n.language);
  const branchName = order.branchName || (order.branchId ? brand?.branchNames?.[order.branchId] : undefined);
  return (
    <article className={`order-card order-card--actionable order-card--${group === 'processing' ? 'hot' : group === 'delivered' ? 'done' : 'new'}`} style={style}>
      <div className="order-card__topline">
        <span className={`order-card__state-badge order-card__state-badge--${group ?? 'new'}`}>
          {order.statusVerified === false ? t('ops.reliability.noInformation') : t(`ops.subStates.${getKanbanSubState(order)}`)}
        </span>
        <span className="order-id" title={order.orderNumber || order.id}>{order.orderNumber || order.id}</span>
      </div>
      <div className="order-card__identity">
        <strong className="order-customer">{order.customerName ?? t(order.customerKey)}</strong>
        <strong className="order-card__amount">{order.amountKnown === false ? t('ops.reliability.noInformation') : orderAmount(order.total, brand, i18n.language)}</strong>
      </div>
      <div className="order-card__context">
        <span>{t(`orders.${order.deliveryType}`)}</span>
        {createdTime ? <time dateTime={order.createdAt}>{t('ops.actions.created', { time: createdTime })}</time> : null}
      </div>
      {showBranch ? <p className="order-card__branch">{branchName || t('ops.actions.branchUnknown')}</p> : null}
      <p className="order-card__phone">{phone || t('ops.reliability.noInformation')}</p>
      {order.leadTag ? <span className={`order-lead-tag order-lead-tag--${order.leadTag}`}>{t(`orders.lead.${order.leadTag}`)}</span> : null}
      {action && onAdvance ? <button type="button" className={`ag-btn order-quick-action${order.needsHuman ? '' : ' ag-btn--primary'}`}
        disabled={mutation?.pending} aria-busy={mutation?.pending} onClick={() => void onAdvance()}>
        {t(mutation?.pending ? 'ops.actions.saving' : action.labelKey)}
      </button> : null}
      {mutation?.errorKey ? <p className="order-action-error" role="alert">{t(mutation.errorKey)}</p> : null}
      <div className="order-card-actions">
        <button type="button" onClick={onClick}><IonIcon icon={openOutline} aria-hidden="true" />{t('ops.actions.details')}</button>
        <button type="button" className={order.needsHuman ? 'is-primary' : undefined} onClick={onChat}><IonIcon icon={chatbubbleEllipsesOutline} aria-hidden="true" />{t('orders.openChat')}</button>
        {phone ? <a href={`tel:${phone}`}><IonIcon icon={callOutline} aria-hidden="true" />{t('orders.call')}</a> : null}
      </div>
    </article>
  );
}
