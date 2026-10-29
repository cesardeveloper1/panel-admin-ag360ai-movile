import { useEffect, useMemo, useRef, useState } from 'react';
import { IonIcon, IonSearchbar, IonSpinner, IonToggle } from '@ionic/react';
import { addOutline, searchOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { FilterChips } from '../components/FilterChips';
import NewProductSheet from '../components/NewProductSheet';
import { StackLayout } from '../components/layouts';
import { useApp } from '../hooks/useApp';
import { apiFacade } from '../services/apiFacade';
import { ProductMutationQueue } from '../services/productMutationQueue';
import type { CatalogCategory, CatalogProduct } from '../types';

type CategoryFilter = 'all' | string;

const ProductsPage: React.FC = () => {
  const { t } = useTranslation();
  const { brand, showToast } = useApp();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mutationQueue = useRef(new ProductMutationQueue());
  const mutationVersions = useRef(new Map<string, number>());

  useEffect(() => {
    if (!brand) return;
    setLoading(true);
    setCategory('all');
    void apiFacade.getCatalogMenu(brand.id)
      .then((data) => {
        setProducts(data.products);
        setCategories(data.categories);
      })
      .finally(() => setLoading(false));
  }, [brand]);

  useEffect(() => {
    if (!searchOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [searchOpen]);

  const chips = useMemo(
    () => {
      const categoryMap = new Map(categories.map((item) => [item.id, item.name]));
      for (const product of products) {
        const id = product.categoryId || product.category;
        if (!categoryMap.has(id)) {
          categoryMap.set(id, product.categoryName || t(`menu.categories.${product.category}`));
        }
      }
      return [
        { id: 'all', label: t('menu.categories.all') },
        ...Array.from(categoryMap, ([id, label]) => ({ id, label })),
      ];
    },
    [categories, products, t],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = category === 'all' || (p.categoryId || p.category) === category;
      const name = (p.name || (p.nameKey ? t(p.nameKey) : '')).toLowerCase();
      const matchQuery = !q || name.includes(q);
      return matchCat && matchQuery;
    });
  }, [products, category, query, t]);

  const onToggle = (product: CatalogProduct, desired: boolean) => {
    const version = (mutationVersions.current.get(product.id) ?? 0) + 1;
    mutationVersions.current.set(product.id, version);
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, active: desired } : p)));

    void mutationQueue.current
      .enqueue(product.id, desired, (productId, isActive) =>
        apiFacade.setCatalogProductActive({ ...product, active: isActive }, isActive).then(() => undefined),
      )
      .then(() => {
        if (mutationVersions.current.get(product.id) === version) {
          showToast(desired ? 'toast.productEnabled' : 'toast.productDisabled');
        }
      })
      .catch(() => {
        if (mutationVersions.current.get(product.id) !== version) return;
        setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, active: product.active } : p)));
        showToast('toast.productUpdateError');
      });
  };

  const handleCreateProduct = async (input: import('../types').CreateCatalogProductInput) => {
    setIsCreating(true);
    try {
      const created = await apiFacade.createCatalogProduct(input);
      setProducts((previous) => [created, ...previous]);
      setCategory('all');
      setIsCreateOpen(false);
      showToast('toast.productCreated');
    } catch {
      showToast('toast.productCreateError');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <StackLayout
      title={t('menu.title')}
      showAlerts
      trailing={(
        <div className="ops-tools" ref={searchRef}>
          <button
            className="ops-tool-btn"
            type="button"
            aria-label={t('menu.search')}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((open) => !open)}
          >
            <IonIcon icon={searchOutline} aria-hidden="true" />
          </button>
          <button
            className="ops-tool-btn"
            type="button"
            aria-label={t('menu.newProduct')}
            onClick={() => {
              setSearchOpen(false);
              setIsCreateOpen(true);
            }}
          >
            <IonIcon icon={addOutline} aria-hidden="true" />
          </button>
          {searchOpen ? (
            <div className="ops-filter-popover ops-filter-popover--search" role="dialog" aria-label={t('menu.search')}>
              <IonSearchbar
                className="chats-search"
                value={query}
                onIonInput={(event) => setQuery(event.detail.value ?? '')}
                placeholder={t('menu.search')}
                debounce={200}
              />
            </div>
          ) : null}
        </div>
      )}
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
              <div className="product-card__thumb">
                {product.imageUrl ? <img src={product.imageUrl} alt="" /> : product.emoji || '🍽️'}
              </div>
              <div className="product-card__body">
                <div className="product-card__row">
                  <h3>{product.name || (product.nameKey ? t(product.nameKey) : '')}</h3>
                  {product.soldOut ? <span className="ag-pill ag-pill--hot">{t('menu.soldOut')}</span> : null}
                </div>
                <p className="product-card__meta">
                  {product.categoryName || t(`menu.categories.${product.category}`)}
                </p>
                <p className="product-card__price">S/ {product.price.toFixed(2)}</p>
              </div>
              <IonToggle
                checked={product.active}
                disabled={product.soldOut}
                onIonChange={(event) => onToggle(product, event.detail.checked)}
              />
            </article>
          ))}
        </div>
      )}

      <NewProductSheet
        open={isCreateOpen}
        busy={isCreating}
        categories={categories}
        brandId={brand?.id || ''}
        onDismiss={() => !isCreating && setIsCreateOpen(false)}
        onSubmit={handleCreateProduct}
      />
    </StackLayout>
  );
};

export default ProductsPage;
