import type { MenuItem } from '@/types';

/** Coerce /api/menu JSON into typed rows so the UI never breaks on partial or legacy documents. */
export function normalizeMenuItemsFromApi(data: unknown): MenuItem[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((m: Record<string, unknown>): MenuItem | null => {
      const _id = m._id != null ? String(m._id) : '';
      if (!_id) return null;
      const rawOpts = Array.isArray(m.pricingOptions) ? m.pricingOptions : [];
      const pricingOptions = rawOpts.map((p: Record<string, unknown>) => {
        const price = p.price;
        const num =
          typeof price === 'number' && !Number.isNaN(price)
            ? price
            : price != null && price !== ''
              ? Number(price)
              : null;
        return {
          sizeOption: String(p.sizeOption ?? ''),
          price: num != null && !Number.isNaN(num) ? num : null,
          unit: String(p.unit ?? 'each'),
        };
      });
      return {
        _id,
        name: String(m.name ?? ''),
        category: String(m.category ?? ''),
        description: typeof m.description === 'string' ? m.description : undefined,
        menuType: m.menuType as MenuItem['menuType'],
        notes: typeof m.notes === 'string' ? m.notes : undefined,
        pricingOptions,
        minOrder: typeof m.minOrder === 'number' ? m.minOrder : undefined,
        minOrderUnit: typeof m.minOrderUnit === 'string' ? m.minOrderUnit : undefined,
        isQuoteBased: Boolean(m.isQuoteBased),
        isActive: m.isActive !== false,
        createdAt: String(m.createdAt ?? ''),
        updatedAt: String(m.updatedAt ?? ''),
      };
    })
    .filter((x: MenuItem | null): x is MenuItem => x != null);
}
