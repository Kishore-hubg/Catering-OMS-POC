'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils/format';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/orders/new', label: 'New Order' },
  { href: '/orders', label: 'Orders' },
  { href: '/send-quote', label: 'Send Quote' },
  { href: '/kitchen', label: 'Weekly Plan' },
];

export function Topbar() {
  const pathname = usePathname();

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <header className="no-print flex items-center justify-between h-14 px-8 bg-navy-500 text-white shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-saffron-500 to-amber-600 flex items-center justify-center font-black text-white text-base tracking-tight">
          NC
        </div>
        <span className="text-lg font-bold tracking-wide text-white">
          Nidhi <span className="text-saffron-400">Catering</span>
        </span>
      </div>

      {/* Horizontal nav + Signout */}
      <nav className="flex items-center gap-1.5">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : item.href === '/orders/new'
                ? pathname === '/orders/new'
                : item.href === '/orders'
                  ? (pathname === '/orders' || pathname.startsWith('/orders/')) && pathname !== '/orders/new'
                  : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200',
                isActive
                  ? 'bg-saffron-500 text-white'
                  : 'text-white/65 hover:bg-white/10 hover:text-white'
              )}
            >
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleSignOut}
          className="ml-2 px-3.5 py-1.5 rounded-md text-[13px] font-medium text-white/65 hover:bg-white/10 hover:text-white transition-all duration-200"
        >
          Signout
        </button>
      </nav>
    </header>
  );
}
