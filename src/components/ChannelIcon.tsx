import { IonIcon } from '@ionic/react';
import { logoInstagram, logoWhatsapp } from 'ionicons/icons';

export function channelLabel(channel?: string): string {
  if (channel === 'instagram') return 'Instagram';
  if (channel === 'messenger') return 'Messenger';
  return 'WhatsApp';
}

export function ChannelIcon({ channel }: { channel?: string }) {
  const label = channelLabel(channel);
  return (
    <span className="channel-icon" role="img" aria-label={label} title={label}>
      {channel === 'messenger' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.14 2 11.25c0 2.91 1.46 5.51 3.75 7.2V22l3.43-1.88c.9.25 1.84.38 2.82.38 5.52 0 10-4.14 10-9.25S17.52 2 12 2Zm1 12.46-2.55-2.72-4.97 2.72 5.47-5.81 2.61 2.72 4.91-2.72L13 14.46Z" />
        </svg>
      ) : (
        <IonIcon icon={channel === 'instagram' ? logoInstagram : logoWhatsapp} aria-hidden="true" />
      )}
    </span>
  );
}
