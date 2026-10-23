import { IonButton, IonContent, IonFooter, IonHeader, IonModal, IonSpinner, IonTitle, IonToolbar } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import type { Order } from '../types';
import { useApp } from '../hooks/useApp';
import { apiFacade } from '../services/apiFacade';
import { getKanbanSubState } from '../utils/orderKanban';
import { nextOrderAction } from '../utils/orderActions';
import { orderAmount, orderCreatedTime } from '../utils/orderPresentation';

interface OrderDetailSheetProps { order: Order | null; open: boolean; onClose: () => void; onChat?: () => void }

export function OrderDetailSheet({ order, open, onClose, onChat }: OrderDetailSheetProps) {
  const { t, i18n } = useTranslation();
  const { brand, authEpoch, ordersFilters, advanceOrder, canChangeOrders, orderMutations } = useApp();
  const [detail, setDetail] = useState<{ key: string; data?: Order; failed?: boolean }>({ key: '' });
  const [attempt, setAttempt] = useState(0);
  const key = `${authEpoch}|${brand?.id}|${ordersFilters.branchId ?? ''}|${order?.id}|${open}`;
  const keyRef = useRef(key);
  keyRef.current = key;
  const brandRef = useRef(brand);
  brandRef.current = brand;
  const orderRef = useRef(order);
  orderRef.current = order;

  useEffect(() => {
    let active = true;
    const selected = orderRef.current;
    const activeBrand = brandRef.current;
    if (!open || !selected || !activeBrand) return;
    setDetail({ key });
    void apiFacade.getOrderDetail(activeBrand, selected).then(data => {
      if (active && keyRef.current === key) setDetail({ key, data });
    }).catch(() => {
      if (active && keyRef.current === key) setDetail({ key, failed: true });
    });
    return () => { active = false; };
  }, [key, open, attempt]);

  if (!order) return null;
  const loaded = detail.key === key ? detail.data : undefined;
  const failed = detail.key === key && detail.failed;
  const mutation = orderMutations[order.id];
  // A refreshed list can invalidate a previously loaded action; preflight also checks on the server.
  const current = loaded ? { ...loaded, status: order.updatedAt && loaded.updatedAt && order.updatedAt > loaded.updatedAt ? order.status : loaded.status } : order;
  const action = nextOrderAction(current, Boolean(loaded && canChangeOrders));
  const createdTime = orderCreatedTime(current, brand, i18n.language);
  const money = (amount: number) => orderAmount(amount, brand, i18n.language);
  const branchName = current.branchName || (current.branchId ? brand?.branchNames?.[current.branchId] : undefined);
  const channel = current.messagingChannel && ['whatsapp', 'instagram', 'messenger'].includes(current.messagingChannel) ? current.messagingChannel : current.channel;

  const advance = async () => {
    const startedKey = key;
    const result = await advanceOrder(order.id, current.status);
    if (keyRef.current !== startedKey) return;
    if (result.ok) onClose();
    else if (result.reason === 'conflict') setAttempt(value => value + 1);
  };

  return (
    <IonModal className="order-detail-modal" isOpen={open} onDidDismiss={onClose} canDismiss={!mutation?.pending}
      initialBreakpoint={1} breakpoints={[0, 1]}>
      <IonHeader><IonToolbar>
        <IonTitle>{t('orderDetail.title', { id: order.orderNumber || order.id })}</IonTitle>
        <IonButton slot="end" fill="clear" disabled={mutation?.pending} onClick={onClose}>{t('orderDetail.close')}</IonButton>
      </IonToolbar></IonHeader>
      <IonContent className="order-sheet-content">
        <div className="order-sheet-body">
          <div className="order-sheet-summary">
            <strong>{current.customerName ?? t(current.customerKey)}</strong>
            <span className="ag-pill">{current.statusVerified === false ? t('ops.reliability.noInformation') : t(`ops.subStates.${getKanbanSubState(current)}`)}</span>
            <span>{t(`orders.${current.deliveryType}`)}</span>
            {createdTime ? <time dateTime={current.createdAt}>{t('ops.actions.created', { time: createdTime })}</time> : null}
          </div>
          {!loaded && !failed ? <div className="order-detail-loading" role="status"><IonSpinner name="crescent" />{t('ops.actions.loadingDetail')}</div> : null}
          {failed ? <div className="order-action-error" role="alert"><p>{t('ops.actions.detailFailed')}</p><button type="button" className="ag-btn" onClick={() => setAttempt(value => value + 1)}>{t('ops.reliability.retry')}</button></div> : null}
          {loaded ? <>
            <div className="order-sheet-row"><span className="order-sheet-label">{t('orderDetail.channel')}</span><span>{t(`orders.channel.${channel}`)}</span></div>
            <div className="order-sheet-row"><span className="order-sheet-label">{t('orderDetail.location')}</span><span>{branchName || t(current.locationKey)}</span></div>
            <div className="order-sheet-row"><span className="order-sheet-label">{t('orderDetail.paymentMethod')}</span><span>{current.paymentMethod ? t(`orderDetail.payment.${current.paymentMethod}`) : t('ops.reliability.noInformation')}</span></div>
            {current.address ? <div className="order-sheet-row"><span className="order-sheet-label">{t('ops.actions.address')}</span><span>{current.address}{current.addressReference ? ` · ${current.addressReference}` : ''}</span></div> : null}
            <h3 className="order-sheet-section">{t('orderDetail.cart')}</h3>
            {current.items.length ? <ul className="order-sheet-items">{current.items.map((item, idx) => <li key={idx}>
              <div><strong>{item.qty}× {item.name?.trim() || t(item.nameKey)}</strong>
                {item.notes ? <p>{item.notes}</p> : null}
                {item.modifiers?.map((modifier, index) => <p key={index}>{modifier.qty}× {modifier.name} · {money(modifier.price)}</p>)}
              </div><span>{money(item.qty * item.price)}</span>
            </li>)}</ul> : <p>{t('ops.actions.noItems')}</p>}
            {current.notes ? <section><h3 className="order-sheet-section">{t('ops.actions.notes')}</h3><p>{current.notes}</p></section> : null}
          </> : null}
        </div>
      </IonContent>
      <IonFooter className="order-sheet-footer">
        <div className="order-sheet-total"><span>{t('orderDetail.total')}</span><strong>{current.amountKnown === false ? t('ops.reliability.noInformation') : money(current.total)}</strong></div>
        {loaded && onChat && current.agentStateId ? <button type="button" className="ag-btn" disabled={mutation?.pending} onClick={onChat}>{t('orders.openChat')}</button> : null}
        {mutation?.errorKey ? <p className="order-action-error" role="alert">{t(mutation.errorKey)}</p> : null}
        {action ? <button type="button" className="ag-btn ag-btn--primary order-sheet-cta" disabled={mutation?.pending} aria-busy={mutation?.pending} onClick={() => void advance()}>
          {t(mutation?.pending ? 'ops.actions.saving' : action.labelKey)}
        </button> : loaded && !canChangeOrders ? <p className="order-readonly">{t('ops.actions.readOnly')}</p> : null}
      </IonFooter>
    </IonModal>
  );
}
