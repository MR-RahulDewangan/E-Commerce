import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/components/providers/AppProviders';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { AuthModal } from '@/components/auth/AuthModal';

export const metadata: Metadata = {
  title: 'BharatStore Maison | Handcrafted Indian Luxury & Heritage',
  description: 'High-performance luxury e-commerce platform for handcrafted Indian textiles and couture with server-authoritative GST calculations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased min-h-screen flex flex-col bg-background text-foreground">
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
