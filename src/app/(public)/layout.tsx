/**
 * Public layout: wraps all customer-facing pages with Header, Footer,
 * CartProvider, and ReservationModalProvider.
 */
import { ReservationModalProvider } from "@/contexts/ReservationModalContext";
import { CartProvider } from "@/contexts/CartContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import JsonLd from "@/components/seo/JsonLd";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ReservationModalProvider>
      <CartProvider>
        <JsonLd />
        <Header />
        <main className="min-h-screen" id="main-content">
          {children}
        </main>
        <Footer />
      </CartProvider>
    </ReservationModalProvider>
  );
}
