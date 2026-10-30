import { useTranslation } from 'react-i18next';
import { formatReservationNumber, type MadeReservation } from '../services/reservationService';

export function ReservationCard({ reservation }: { reservation: MadeReservation }) {
  const { t } = useTranslation();
  const status = t(`ops.reservations.status.${reservation.status}`);
  const name = reservation.customerName || t('ops.reliability.noInformation');
  return (
    <article className="order-card" aria-label={`${name}: ${status}`}>
      <div className="order-card__topline">
        <span className={`order-card__state-badge order-card__state-badge--${reservation.status}`}>{status}</span>
        <span className="order-id">{formatReservationNumber(reservation.reservationNumber)}</span>
      </div>
      <div className="order-card__identity">
        <strong className="order-customer">{name}</strong>
        <strong className="order-card__amount">{t('ops.reservations.party', { count: reservation.partySize })}</strong>
      </div>
      <div className="order-card__context">
        <time dateTime={`${reservation.reservationDate}T${reservation.reservationTime}`}>
          {reservation.reservationDate} · {reservation.reservationTime}
        </time>
        {reservation.zoneName ? <span>{reservation.zoneName}</span> : null}
      </div>
      <p className="order-card__phone">{reservation.phone || t('ops.reliability.noInformation')}</p>
    </article>
  );
}
