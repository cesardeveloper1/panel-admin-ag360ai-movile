import type { CatalogCategory, CatalogMenu, CatalogProduct, CreateCatalogProductInput } from '../types';
import { asArray, unwrapApiPayload } from '../utils/apiPayload';
import { api } from './api';

interface ApiCategory {
  _id?: string;
  id?: string;
  name?: string;
  order?: number;
}

interface ApiProduct {
  _id?: string;
  id?: string;
  name?: string;
  categoryId?: string;
  categoryName?: string;
  basePrice?: number | string | null;
  isActive?: boolean;
  image?: string;
}

function toId(item: { _id?: string; id?: string }): string {
  return String(item._id ?? item.id ?? '').trim();
}

function toPrice(value: ApiProduct['basePrice']): number {
  const price = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(price) ? price : 0;
}

function mapProduct(
  product: ApiProduct,
  brandId: string,
  categoryNames: Map<string, string>,
): CatalogProduct | null {
  const id = toId(product);
  const name = product.name?.trim();
  if (!id || !name) return null;

  const categoryId = product.categoryId?.trim();
  const categoryName = product.categoryName?.trim() ||
    (categoryId ? categoryNames.get(categoryId) : undefined);

  return {
    id,
    brandId,
    name,
    category: categoryId || categoryName || 'uncategorized',
    categoryId,
    categoryName,
    price: toPrice(product.basePrice),
    active: product.isActive !== false,
    imageUrl: product.image?.trim() || undefined,
  };
}

/** Catálogo compartido con el gestor de menú del panel web. */
export const catalogService = {
  async getMenu(brandId: string): Promise<CatalogMenu> {
    const [categoriesResponse, productsResponse] = await Promise.all([
      api.get(`/category/${encodeURIComponent(brandId)}`),
      api.get(`/product/${encodeURIComponent(brandId)}`),
    ]);

    const categories = asArray<ApiCategory>(unwrapApiPayload<unknown>(categoriesResponse))
      .map((category): CatalogCategory | null => {
        const id = toId(category);
        const name = category.name?.trim();
        return id && name ? { id, name, order: category.order } : null;
      })
      .filter((category): category is CatalogCategory => category !== null)
      .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));

    const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
    const products = asArray<ApiProduct>(unwrapApiPayload<unknown>(productsResponse))
      .map((product) => mapProduct(product, brandId, categoryNames))
      .filter((product): product is CatalogProduct => product !== null);

    return { categories, products };
  },

  async setActive(productId: string, isActive: boolean): Promise<void> {
    await api.patch(`/product/${encodeURIComponent(productId)}`, { isActive });
  },

  async createProduct(input: CreateCatalogProductInput): Promise<CatalogProduct> {
    const response = await api.post('/product', {
      brandId: input.brandId,
      name: input.name,
      categoryId: input.categoryId,
      basePrice: input.price,
      isActive: input.active,
    });
    const categoryNames = new Map([[input.categoryId, input.categoryName]]);
    const product = mapProduct(unwrapApiPayload<ApiProduct>(response), input.brandId, categoryNames);
    if (!product) throw new Error('El servidor no devolvió el producto creado.');
    return product;
  },
};
