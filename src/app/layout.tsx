import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { Providers, LayoutWrapper } from '@/components/layout/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nidhi Catering - Order Management',
  description: 'Catering order management system for Nidhi Catering, Dallas TX',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1B2A4A',
              color: '#fff',
            },
            success: {
              iconTheme: { primary: '#F4A300', secondary: '#fff' },
            },
          }}
        />
      </body>
    </html>
  );
}
