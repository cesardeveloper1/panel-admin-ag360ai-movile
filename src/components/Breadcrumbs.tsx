import { IonIcon } from '@ionic/react';
import { chevronForwardOutline } from 'ionicons/icons';
import { useAppNavigation } from '../hooks/useAppNavigation';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  const { go } = useAppNavigation();

  if (items.length === 0) return null;

  return (
    <nav className="ag-breadcrumbs" aria-label="breadcrumb">
      <ol className="ag-breadcrumbs__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="ag-breadcrumbs__item">
              {item.path && !isLast ? (
                <button type="button" className="ag-breadcrumbs__link" onClick={() => go(item.path!)}>
                  {item.label}
                </button>
              ) : (
                <span className={`ag-breadcrumbs__text${isLast ? ' ag-breadcrumbs__text--current' : ''}`}>
                  {item.label}
                </span>
              )}
              {!isLast ? <IonIcon icon={chevronForwardOutline} className="ag-breadcrumbs__sep" aria-hidden /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
