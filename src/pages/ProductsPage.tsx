import { useEffect, useMemo, useState } from 'react';
import { IonSpinner, IonToggle } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { FilterChips } from '../components/FilterChips';
import { StackLayout } from '../components/layouts';
import { useApp } from '../context/AppContext';
import { apiMock } from '../services/apiMock';
import type { CatalogProduct, ProductCategory } from '../types';

type CategoryFilter = 'all' | ProductCategory;

const ProductsPage: React.FC = () => {
  const { t } = useTranslation();
  const { brand, showToast } = useApp();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');

  useEffect(() => {
    if (!brand) return;
    setLoading(true);
    void apiMock.getProducts(brand.id).then((data) => {
      setProducts(data);
      setLoading(false);
    });
  }, [brand]);

  const chips = useMemo(
    () => [
      { id: 'all', label: t('menu.categories.all') },
      { id: 'starters', label: t('menu.categories.starters') },
      { id: 'mains', label: t('menu.categories.mains') },
      { id: 'drinks', label: t('menu.categories.drinks') },
      { id: 'desserts', label: t('menu.categories.desserts') },
    ],
    [t],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = category === 'all' || p.category === category;
      const name = t(p.nameKey).toLowerCase();
      const matchQuery = !q || name.includes(q);
      return matchCat && matchQuery;
    });
  }, [products, category, query, t]);

  const onToggle = async (product: CatalogProduct) => {
    const updated = await apiMock.toggleProductActive(product.id);
    if (!updated) return;
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    showToast(updated.active ? 'toast.productEnabled' : 'toast.productDisabled');
  };

  return (
    <StackLayout
      title={t('menu.title')}
      showAlerts
      search={{
        value: query,
        placeholder: t('menu.search'),
        onChange: setQuery,
      }}
    >
      <FilterChips chips={chips} value={category} onChange={(id) => setCategory(id as CategoryFilter)} />

      {loading ? (
        <div className="module-loading">
          <IonSpinner name="crescent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="module-empty">{t('menu.empty')}</p>
      ) : (
        <div className="product-list">
          {filtered.map((product) => (
            <article key={product.id} className={`product-card${product.soldOut ? ' product-card--soldout' : ''}`}>
              <div className="product-card__thumb">{product.emoji}</div>
              <div className="product-card__body">
                <div className="product-card__row">
                  <h3>{t(product.nameKey)}</h3>
                  {product.soldOut ? <span className="ag-pill ag-pill--hot">{t('menu.soldOut')}</span> : null}
                </div>
                <p className="product-card__meta">{t(`menu.categories.${product.category}`)}</p>
                <p className="product-card__price">S/ {product.price.toFixed(2)}</p>
              </div>
              <IonToggle
                checked={product.active}
                disabled={product.soldOut}
                onIonChange={() => void onToggle(product)}
              />
            </article>
          ))}
        </div>
      )}

      <button type="button" className="module-fab" onClick={() => showToast('toast.comingSoon')}>
        + {t('menu.newProduct')}
      </button>
    </StackLayout>
  );
};

export default ProductsPage;
