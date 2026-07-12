import {
  IonButton,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import type { Order } from '../types';
import { useApp } from '../context/AppContext';

interface OrderDetailSheetProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
}

export function OrderDetailSheet({ order, open, onClose }: OrderDetailSheetProps) {
  const { t } = useTranslation();
  const { advanceOrder } = useApp();
  const [handlingMode, setHandlingMode] = useState<'self' | 'ai'>('self');

  if (!order) return null;

  const canAdvance = ['accepted', 'in_kitchen', 'ready', 'on_the_way'].includes(order.status);
  const advanceLabel =
    order.status === 'accepted'
      ? t('orderDetail.sendKitchen')
      : order.status === 'in_kitchen'
        ? t('orderDetail.markReady')
        : order.status === 'ready'
          ? t('orderDetail.handOff')
          : t('orderDetail.markDelivered');

  return (
    <IonModal isOpen={open} onDidDismiss={onClose} initialBreakpoint={0.75} breakpoints={[0, 0.5, 0.75, 1]}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('orderDetail.title', { id: order.id })}</IonTitle>
          <IonButton slot="end" fill="clear" onClick={onClose}>
            {t('orderDetail.close')}
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="order-sheet-content">
        <div className="order-sheet-body">
          <div className="order-handling-mode">
            <button type="button" className={handlingMode === 'self' ? 'active' : ''} onClick={() => setHandlingMode('self')}>{t('orderDetail.myself')}</button>
            <button type="button" className={handlingMode === 'ai' ? 'active' : ''} onClick={() => setHandlingMode('ai')}>{t('orderDetail.ai')}</button>
          </div>
          <div className="order-sheet-row">
            <span className="order-sheet-label">{t('orderDetail.buyer')}</span>
            <strong>{t(order.customerKey)}</strong>
          </div>
          <div className="order-sheet-row">
            <span className="order-sheet-label">{t('orderDetail.status')}</span>
            <span className="ag-pill ag-pill--new">{t(`orders.status.${order.status}`)}</span>
          </div>
          <div className="order-sheet-row">
            <span className="order-sheet-label">{t('orderDetail.channel')}</span>
            <span>{t(`orders.channel.${order.channel}`)}</span>
          </div>
          <div className="order-sheet-row">
            <span className="order-sheet-label">{t('orderDetail.delivery')}</span>
            <span>{t(`orders.${order.deliveryType}`)}</span>
          </div>
          <div className="order-sheet-row">
            <span className="order-sheet-label">{t('orderDetail.location')}</span>
            <span>{t(order.locationKey)}</span>
          </div>
          <div className="order-sheet-row">
            <span className="order-sheet-label">{t('orderDetail.paymentMethod')}</span>
            <span>{t(`orderDetail.payment.${order.paymentMethod ?? 'yape'}`)}</span>
          </div>

          <h3 className="order-sheet-section">{t('orderDetail.cart')}</h3>
          <ul className="order-sheet-items">
            {order.items.map((item, idx) => (
              <li key={idx}>
                <span>
                  {item.qty}× {t(item.nameKey)}
                </span>
                <span>S/ {(item.qty * item.price).toFixed(2)}</span>
              </li>
            ))}
          </ul>

          <div className="order-sheet-total">
            <span>{t('orderDetail.total')}</span>
            <strong>S/ {order.total.toFixed(2)}</strong>
          </div>

          {canAdvance ? (
            <button
              type="button"
              className="ag-btn ag-btn--primary order-sheet-cta"
              onClick={() => {
                void advanceOrder(order.id);
                onClose();
              }}
            >
              {advanceLabel}
            </button>
          ) : null}
        </div>
      </IonContent>
    </IonModal>
  );
}
