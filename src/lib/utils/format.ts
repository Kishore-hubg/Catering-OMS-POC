export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateShort(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    quoted: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-emerald-100 text-emerald-800',
    completed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

export function getMenuTypeColor(menuType: string): string {
  const colors: Record<string, string> = {
    'Veg Menu': 'bg-green-100 text-green-700 border-green-200',
    'Non-Veg Menu': 'bg-red-100 text-red-700 border-red-200',
    'Desserts': 'bg-pink-100 text-pink-700 border-pink-200',
    'Puja Food': 'bg-orange-100 text-orange-700 border-orange-200',
    'Live Catering': 'bg-purple-100 text-purple-700 border-purple-200',
    'Chafing Dishes': 'bg-slate-100 text-slate-700 border-slate-200',
    'Disposable Plates': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  };
  return colors[menuType] || 'bg-gray-100 text-gray-700 border-gray-200';
}

export function getMenuTypeIcon(menuType: string): string {
  // Emojis before item names have been removed to avoid confusion.
  // Keep function for API compatibility but return an empty string.
  return '';
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
