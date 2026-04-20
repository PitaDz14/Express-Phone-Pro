
import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from "@/firebase/client-provider"
import { AuthGate } from "@/components/auth-gate"
import { NavigationDock } from "@/components/layout/navigation-dock"
import { ThemeProvider } from "@/components/theme-provider"
import { AutoBackup } from "@/components/auto-backup"
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar"

export const metadata: Metadata = {
  title: 'Express Phone Pro | نظام الإدارة المتكامل',
  description: 'نظام إدارة احترافي لمحل تصليح وبيع الهواتف - يعمل بدون إنترنت مع مزامنة ذكية',
  manifest: '/manifest.json',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><defs><linearGradient id=%22g%22 x1=%220%%22 y1=%220%%22 x2=%22100%%22 y2=%22100%%22><stop offset=%220%%22 style=%22stop-color:%233960AC;stop-opacity:1%22 /><stop offset=%22100%%22 style=%22stop-color:%233CC2DD;stop-opacity:1%22 /></linearGradient></defs><rect x=%2222%22 y=%2212%22 width=%2256%22 height=%2276%22 rx=%2212%22 fill=%22url(%23g)%22/><rect x=%2228%22 y=%2220%22 width=%2244%22 height=%2254%22 rx=%224%22 fill=%22white%22 fill-opacity=%220.2%22/><circle cx=%2250%22 cy=%2280%22 r=%224%22 fill=%22white%22/></svg>',
    apple: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><defs><linearGradient id=%22g%22 x1=%220%%22 y1=%220%%22 x2=%22100%%22 y2=%22100%%22><stop offset=%220%%22 style=%22stop-color:%233960AC;stop-opacity:1%22 /><stop offset=%22100%%22 style=%22stop-color:%233CC2DD;stop-opacity:1%22 /></linearGradient></defs><rect x=%2222%22 y=%2212%22 width=%2256%22 height=%2276%22 rx=%2212%22 fill=%22url(%23g)%22/><rect x=%2228%22 y=%2220%22 width=%2244%22 height=%2254%22 rx=%224%22 fill=%22white%22 fill-opacity=%220.2%22/><circle cx=%2250%22 cy=%2280%22 r=%224%22 fill=%22white%22/></svg>',
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
              <ServiceWorkerRegistrar />
              {children}
              <NavigationDock />
              <AutoBackup />
            </AuthGate>
          </ThemeProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
