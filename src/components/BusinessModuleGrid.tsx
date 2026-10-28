import { IonIcon } from '@ionic/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { BusinessModule } from '../navigation/businessModules';
import { BUSINESS_MODULES } from '../navigation/businessModules';

export interface BusinessModuleGridProps {
  titleKey: (mod: BusinessModule) => string;
  descKey: (mod: BusinessModule) => string;
  onSelect: (mod: BusinessModule) => void;
  include?: (mod: BusinessModule) => boolean;
  /** Extra class on the grid container */
  className?: string;
  children?: ReactNode;
}

/** Grid de hub-cards compartido por Pagos / Business. */
export function BusinessModuleGrid({
  titleKey,
  descKey,
  onSelect,
  include,
  className = 'hub-grid',
  children,
}: BusinessModuleGridProps) {
  const { t } = useTranslation();
  const modules = include ? BUSINESS_MODULES.filter(include) : BUSINESS_MODULES;

  return (
    <div className={className}>
      {modules.map((mod, idx) => (
        <button
          key={mod.id}
          type="button"
          className={`hub-card hub-card--${mod.hubTone} ag-enter`}
          style={{ animationDelay: `${idx * 60}ms` }}
          onClick={() => onSelect(mod)}
        >
          <span className="hub-card-icon">
            <IonIcon icon={mod.icon} />
          </span>
          <span className="hub-card-copy">
            <strong>{t(titleKey(mod))}</strong>
            <span>{t(descKey(mod))}</span>
          </span>
        </button>
      ))}
      {children}
    </div>
  );
}
