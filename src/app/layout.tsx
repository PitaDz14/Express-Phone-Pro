
import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from "@/firebase/client-provider"
import { AuthGate } from "@/components/auth-gate"
import { NavigationDock } from "@/components/layout/navigation-dock"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  title: 'Express Phone Pro | Offline-First',
  description: 'نظام إدارة احترافي لمحل تصليح وبيع الهواتف - يعمل بدون إنترنت مع مزامنة ذكية',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png', // Fallback to logo.png in public folder
    apple: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Express Phone Pro',
  },
};

export const viewport: Viewport = {
  themeColor: '#3960AC',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
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
          <ThemeProvider>
            <AuthGate>
              {children}
              <NavigationDock />
            </AuthGate>
          </ThemeProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
