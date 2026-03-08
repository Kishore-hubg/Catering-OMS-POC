'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { formatCurrency, getMenuTypeIcon, getMenuTypeColor, cn } from '@/lib/utils/format';
import type { MenuItem, MenuType, PricingOption } from '@/types';

const MENU_TYPES: MenuType[] = [
  'Veg Menu',
  'Non-Veg Menu',
  'Desserts',
  'Puja Food',
  'Live Catering',
  'Chafing Dishes',
  'Disposable Plates',
];

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<MenuType | 'All'>('All');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ updated: number; skipped: number; errors?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/menu?includeInactive=true')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setItems(res.data);
        else setError(res.error || 'Failed to load menu');
      })
      .catch(() => setError('Failed to load menu'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = items;
    if (activeType !== 'All') result = result.filter((i) => i.menuType === activeType);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(s) ||
          (i.category || '').toLowerCase().includes(s)
      );
    }
    return result;
  }, [items, activeType, search]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { All: items.length };
    for (const item of items) {
      c[item.menuType] = (c[item.menuType] || 0) + 1;
    }
    return c;
  }, [items]);

  const handleEdit = (item: MenuItem) => setEditing({ ...item });
  const handleCloseEdit = () => {
    setEditing(null);
    setError(null);
  };

  const handleSaveEdit = async (payload: {
    name: string;
    category: string;
    menuType: MenuType;
    description?: string;
    notes?: string;
    pricingOptions: PricingOption[];
    minOrder?: number;
    minOrderUnit?: string;
    isQuoteBased?: boolean;
    isActive?: boolean;
  }) => {
    if (!editing?._id) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/menu/${editing._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Update failed');
        return;
      }
      setItems((prev) =>
        prev.map((i) => (i._id === editing._id ? (data.data as MenuItem) : i))
      );
      handleCloseEdit();
    } catch {
      setError('Update failed');
    } finally {
      setSaving(false);
    }
  };

  const fetchMenu = () => {
    return fetch('/api/menu?includeInactive=true')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setItems(res.data);
        else setError(res.error || 'Failed to load menu');
      })
      .catch(() => setError('Failed to load menu'));
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/menu/export', { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Export failed');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `menu-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Menu exported');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.set('file', file);
      const res = await fetch('/api/menu/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Import failed');
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setImportResult({ updated: data.updated ?? 0, skipped: data.skipped ?? 0, errors: data.errors });
      await fetchMenu();
      if (data.updated > 0) toast.success(`Imported: ${data.updated} updated, ${data.skipped ?? 0} skipped`);
      else if (data.skipped > 0) toast(`No updates; ${data.skipped} rows skipped (not found or no changes)`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading menu...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-500">✏️ Edit menu</h1>
          <p className="text-gray-500 mt-1">
            {items.length} items — click Edit to change name, category, or prices
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={handleExport} className="btn-outline text-sm py-2">
            📥 Export backup
          </button>
          <label className="btn-primary text-sm py-2 cursor-pointer inline-block">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={handleImport}
              disabled={importing}
            />
            {importing ? 'Importing...' : '📤 Import CSV/JSON'}
          </label>
        </div>
      </div>

      {importResult && (
        <div className="card mb-4 bg-gray-50 border-gray-200">
          <p className="text-sm text-navy-600">
            <strong>Import result:</strong> {importResult.updated} updated, {importResult.skipped} skipped.
            {importResult.errors?.length ? (
              <span className="block mt-1 text-amber-700">
                Errors: {importResult.errors.slice(0, 5).join('; ')}
                {importResult.errors.length > 5 ? ` (+${importResult.errors.length - 5} more)` : ''}
              </span>
            ) : null}
          </p>
        </div>
      )}

      <p className="text-xs text-gray-500 mb-4">
        CSV: header <code className="bg-gray-100 px-1 rounded">name,category,menuType,sizeOption,price,unit</code>. JSON: array of items with <code className="bg-gray-100 px-1 rounded">_id</code> or <code className="bg-gray-100 px-1 rounded">name,category,menuType</code> and <code className="bg-gray-100 px-1 rounded">pricingOptions</code>.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveType('All')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium border transition-all',
            activeType === 'All'
              ? 'bg-navy-500 text-white border-navy-500'
              : 'border-gray-200 text-gray-500 hover:border-gray-300'
          )}
        >
          All ({typeCounts.All})
        </button>
        {MENU_TYPES.map((type) => (
          <button
            key={type}
            type="button"
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

      <div className="mb-4">
        <input
          className="input-field max-w-md"
          placeholder="Search by name or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold text-navy-500">Name</th>
                <th className="px-4 py-3 text-sm font-semibold text-navy-500">Category</th>
                <th className="px-4 py-3 text-sm font-semibold text-navy-500">Type</th>
                <th className="px-4 py-3 text-sm font-semibold text-navy-500">Pricing</th>
                <th className="px-4 py-3 text-sm font-semibold text-navy-500">Active</th>
                <th className="px-4 py-3 text-sm font-semibold text-navy-500 w-24">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item._id}
                  className={cn(
                    'border-b border-gray-100 hover:bg-gray-50/50',
                    !item.isActive && 'opacity-60'
                  )}
                >
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-gray-600">{item.category}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-1.5 py-0.5 rounded', getMenuTypeColor(item.menuType))}>
                      {getMenuTypeIcon(item.menuType)} {item.menuType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {item.isQuoteBased ? (
                      <span className="text-purple-600">Quote-based</span>
                    ) : item.pricingOptions?.length ? (
                      <span className="text-gray-600">
                        {item.pricingOptions.map((o, i) => (
                          <span key={i}>
                            {o.sizeOption}: {formatCurrency(o.price ?? 0)}/{o.unit}
                            {i < item.pricingOptions.length - 1 ? ' · ' : ''}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.isActive ? (
                      <span className="text-green-600 text-sm">Yes</span>
                    ) : (
                      <span className="text-gray-400 text-sm">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="btn-ghost text-sm py-1 px-2"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">No items match your filters.</div>
        )}
      </div>

      {editing && (
        <EditMenuModal
          item={editing}
          onSave={handleSaveEdit}
          onClose={handleCloseEdit}
          saving={saving}
          error={error}
        />
      )}
    </div>
  );
}

interface EditMenuModalProps {
  item: MenuItem;
  onSave: (payload: {
    name: string;
    category: string;
    menuType: MenuType;
    description?: string;
    notes?: string;
    pricingOptions: PricingOption[];
    minOrder?: number;
    minOrderUnit?: string;
    isQuoteBased?: boolean;
    isActive?: boolean;
  }) => Promise<void>;
  onClose: () => void;
  saving: boolean;
  error: string | null;
}

function EditMenuModal({ item, onSave, onClose, saving, error }: EditMenuModalProps) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [menuType, setMenuType] = useState<MenuType>(item.menuType);
  const [description, setDescription] = useState(item.description ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [pricingOptions, setPricingOptions] = useState<PricingOption[]>(
    item.pricingOptions?.length ? [...item.pricingOptions] : [{ sizeOption: '', price: null, unit: '' }]
  );
  const [minOrder, setMinOrder] = useState(item.minOrder ?? '');
  const [minOrderUnit, setMinOrderUnit] = useState(item.minOrderUnit ?? '');
  const [isQuoteBased, setIsQuoteBased] = useState(item.isQuoteBased ?? false);
  const [isActive, setIsActive] = useState(item.isActive ?? true);

  const addPriceRow = () => {
    setPricingOptions((prev) => [...prev, { sizeOption: '', price: null, unit: '' }]);
  };

  const updatePriceRow = (index: number, field: keyof PricingOption, value: string | number | null) => {
    setPricingOptions((prev) =>
      prev.map((o, i) => (i === index ? { ...o, [field]: value } : o))
    );
  };

  const removePriceRow = (index: number) => {
    setPricingOptions((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: name.trim(),
      category: category.trim(),
      menuType,
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      pricingOptions: pricingOptions.map((o) => ({
        sizeOption: o.sizeOption.trim() || 'Default',
        price: o.price === undefined || o.price === null || Number.isNaN(Number(o.price)) ? null : Number(o.price),
        unit: (o.unit || '').trim() || 'serving',
      })),
      minOrder: minOrder === '' ? undefined : Number(minOrder),
      minOrderUnit: minOrderUnit.trim() || undefined,
      isQuoteBased,
      isActive,
    };
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-navy-500">Edit: {item.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Update name, category, type, and pricing</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Category *</label>
              <input
                className="input-field"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Menu type *</label>
            <select
              className="input-field"
              value={menuType}
              onChange={(e) => setMenuType(e.target.value as MenuType)}
            >
              {MENU_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <input
              className="input-field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Notes</label>
            <input
              className="input-field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Pricing options</label>
              <button type="button" onClick={addPriceRow} className="btn-ghost text-sm">
                + Add row
              </button>
            </div>
            <div className="space-y-2">
              {pricingOptions.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    className="input-field flex-1"
                    placeholder="Size (e.g. Half Tray)"
                    value={opt.sizeOption}
                    onChange={(e) => updatePriceRow(i, 'sizeOption', e.target.value)}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-field w-24"
                    placeholder="Price"
                    value={opt.price ?? ''}
                    onChange={(e) =>
                      updatePriceRow(i, 'price', e.target.value === '' ? null : Number(e.target.value))
                    }
                  />
                  <input
                    className="input-field w-24"
                    placeholder="Unit"
                    value={opt.unit}
                    onChange={(e) => updatePriceRow(i, 'unit', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removePriceRow(i)}
                    className="text-red-500 hover:text-red-700 p-2"
                    aria-label="Remove row"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Min order</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Min order unit</label>
              <input
                className="input-field"
                value={minOrderUnit}
                onChange={(e) => setMinOrderUnit(e.target.value)}
                placeholder="e.g. tray"
              />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isQuoteBased}
                onChange={(e) => setIsQuoteBased(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Quote-based (contact for price)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Active on menu</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
