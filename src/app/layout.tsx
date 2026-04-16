import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from "@/firebase/client-provider"
import { AuthGate } from "@/components/auth-gate"
import { NavigationDock } from "@/components/layout/navigation-dock"

export const metadata: Metadata = {
  title: 'Express Phone Pro | Khaled_Deragha',
  description: 'نظام إدارة احترافي لمحل تصليح وبيع الهواتف - تم التطوير بواسطة Khaled_Deragha',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap" rel="stylesheet" />
        <style>{`
          body {
            font-family: 'Almarai', sans-serif;
          }
        `}</style>
      </head>
      <body className="antialiased selection:bg-primary selection:text-white pb-32">
        <FirebaseClientProvider>
          <AuthGate>
            {children}
            <NavigationDock />
          </AuthGate>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
