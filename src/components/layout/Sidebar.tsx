'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils/format';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/orders/new', label: 'New Order', icon: '➕' },
  { href: '/orders', label: 'Orders', icon: '📋' },
  { href: '/send-quote', label: 'Send Quote', icon: '✉️' },
  { href: '/kitchen', label: 'Weekly Plan', icon: '📆' },
  { href: '/menu', label: 'Menu', icon: '📖' },
  { href: '/admin/menu', label: 'Edit menu', icon: '✏️' },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <aside className="no-print w-64 bg-navy-500 min-h-screen flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-navy-400">
        <h1 className="text-2xl font-bold text-saffron-400">🪔 Nidhi</h1>
        <p className="text-sm text-navy-200 mt-1">Catering Management</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-saffron-500 text-white shadow-lg shadow-saffron-500/20'
                  : 'text-navy-200 hover:bg-navy-400 hover:text-white'
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-navy-400 space-y-2">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full text-left text-navy-200 hover:text-white hover:bg-navy-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Sign out
        </button>
        <p className="text-xs text-navy-300 text-center">
          Nidhi Catering OMS v1.0
          <br />
          Dallas, TX
        </p>
      </div>
    </aside>
  );
}
