'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatCurrency, getMenuTypeIcon, getMenuTypeColor, cn } from '@/lib/utils/format';
import type { MenuItem, MenuType } from '@/types';

const MENU_TYPES: MenuType[] = [
  'Veg Menu', 'Non-Veg Menu', 'Desserts', 'Puja Food',
  'Live Catering', 'Chafing Dishes', 'Disposable Plates',
  'Drinks', 'Breakfast',
];

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<MenuType>('Veg Menu');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/menu')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setItems(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = items.filter((i) => i.menuType === activeType);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(s) ||
          (i.description || '').toLowerCase().includes(s) ||
          i.category.toLowerCase().includes(s)
      );
    }
    return result;
  }, [items, activeType, search]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const item of items) {
      c[item.menuType] = (c[item.menuType] || 0) + 1;
    }
    return c;
  }, [items]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading menu...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-500">📖 Menu</h1>
          <p className="text-gray-500 mt-1">{items.length} items across {MENU_TYPES.length} categories</p>
        </div>
      </div>

      {/* Menu type tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {MENU_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium border transition-all',
              activeType === type
                ? `${getMenuTypeColor(type)} shadow-sm`
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            )}
          >
            {getMenuTypeIcon(type)} {type}
            <span className="ml-1 text-xs opacity-75">({typeCounts[type] || 0})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          className="input-field max-w-md"
          placeholder="Search items by name, description, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Menu table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold text-navy-500">Item</th>
                <th className="px-4 py-3 text-sm font-semibold text-navy-500">Category</th>
                <th className="px-4 py-3 text-sm font-semibold text-navy-500">Type</th>
                <th className="px-4 py-3 text-sm font-semibold text-navy-500 min-w-[180px]">Description</th>
                <th className="px-4 py-3 text-sm font-semibold text-navy-500">Pricing</th>
                <th className="px-4 py-3 text-sm font-semibold text-navy-500 w-24">Min order</th>
                <th className="px-4 py-3 text-sm font-semibold text-navy-500 min-w-[120px]">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    No items found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item._id}
                    className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-navy-600">{item.name}</td>
                    <td className="px-4 py-3 text-gray-600">{item.category}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', getMenuTypeColor(item.menuType))}>
                        {getMenuTypeIcon(item.menuType)} {item.menuType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                      {item.description ? (
                        <span className="line-clamp-2">{item.description}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.isQuoteBased ? (
                        <span className="text-purple-600 font-medium">Quote-based</span>
                      ) : item.pricingOptions?.length ? (
                        <div className="flex flex-col gap-1">
                          {item.pricingOptions.map((opt, i) => (
                            <span key={i} className="text-gray-700 whitespace-nowrap">
                              {opt.sizeOption}: {formatCurrency(opt.price ?? 0)}/{opt.unit}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.minOrder != null && item.minOrder > 0 ? (
                        <span>{item.minOrder}{item.minOrderUnit ? ` ${item.minOrderUnit}` : ''}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[140px]">
                      {item.notes ? (
                        <span className="line-clamp-2 text-amber-700">{item.notes}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
