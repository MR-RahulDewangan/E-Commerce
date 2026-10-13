import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/components/providers/AppProviders';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { AuthModal } from '@/components/auth/AuthModal';

export const metadata: Metadata = {
  title: 'BharatStore | Handcrafted Indian Fashion & Home',
  description: 'High-performance e-commerce platform for Indian retail with server-authoritative GST calculations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-zinc-50 text-zinc-900">
        <AppProviders>
          <Header />
          <CartDrawer />
          <AuthModal />
          <main className="flex-1">{children}</main>
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
