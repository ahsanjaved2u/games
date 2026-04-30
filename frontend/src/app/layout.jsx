import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FirstVisitPrompt from "@/components/FirstVisitPrompt";
import SignupBanner from "@/components/SignupBanner";
import ReferralBanner from "@/components/ReferralBanner";
import ReferralCapture from "@/components/ReferralCapture";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/components/Toast";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL('https://gamevesta.com'),
  title: {
    default: 'GameVesta — Play. Compete. Win.',
    template: '%s | GameVesta',
  },
  description: 'GameVesta is a skill-based browser gaming platform. Play free and paid HTML5 games, earn real cash rewards, read player reviews, refer friends for bonus PKR, and compete with players for prize pools — all in PKR.',
  keywords: ['browser games', 'skill games', 'earn money playing games', 'online gaming Pakistan', 'compete win cash', 'GameVesta', 'gamevesta.com', 'real money games PKR', 'game reviews', 'player ratings', 'referral bonus', 'invite friends earn money', 'free games Pakistan', 'play and earn PKR'],
  authors: [{ name: 'GameVesta', url: 'https://gamevesta.com' }],
  creator: 'GameVesta',
  publisher: 'GameVesta',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://gamevesta.com',
    siteName: 'GameVesta',
    title: 'GameVesta — Play. Compete. Win.',
    description: 'Skill-based browser gaming platform. Earn real cash rewards by playing HTML5 games, competing in prize pools, and referring friends.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'GameVesta — Play. Compete. Win.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GameVesta — Play. Compete. Win.',
    description: 'Skill-based browser gaming platform. Earn real cash rewards by playing HTML5 games, share reviews, and invite friends.',
    images: ['/og-image.png'],
    creator: '@gamevesta',
  },
  alternates: {
    canonical: 'https://gamevesta.com',
  },
};

// iOS Safari does NOT support the Fullscreen API on iPhone (Apple restriction).
// These tags + the manifest let users "Add to Home Screen" and launch the app
// in true fullscreen mode (no Safari URL bar, no bottom bar) on iPhone.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',           // extend under iOS safe areas (notch / home indicator)
  themeColor: '#0a0b1a',
  // Allow users to pinch-zoom on regular pages (accessibility); games handle
  // their own touch sizing via canvas.
  userScalable: true,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'GameVesta',
  url: 'https://gamevesta.com',
  description: 'Skill-based browser gaming platform where players earn real cash rewards in PKR. Play, review, and refer friends.',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://gamevesta.com/games?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

const appJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'GameVesta',
  url: 'https://gamevesta.com',
  applicationCategory: 'GameApplication',
  operatingSystem: 'All',
  browserRequirements: 'Requires a modern web browser',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'PKR',
    description: 'Free to play with optional paid competitions and referral rewards',
  },
  featureList: [
    'Skill-based HTML5 browser games',
    'Real cash rewards in PKR',
    'Competitive prize pool tournaments',
    'Referral program with bonus PKR',
    'Player reviews and game ratings',
    'Real-time leaderboards',
  ],
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'GameVesta',
  url: 'https://gamevesta.com',
  logo: 'https://gamevesta.com/og-image.png',
  description: 'GameVesta is a skill-based browser gaming platform. Play HTML5 games, earn real PKR cash rewards, share reviews, refer friends for bonuses, and compete in prize pools.',
  sameAs: [],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    url: 'https://gamevesta.com/contact',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0a0b1a" />
        {/* iOS PWA — when added to Home Screen, the game launches truly
            fullscreen with no Safari UI on iPhone */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GameVesta" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="dns-prefetch" href="https://games-3puq.onrender.com" />
        <link rel="preconnect" href="https://games-3puq.onrender.com" crossOrigin="anonymous" />
        <link rel="apple-touch-icon" href="/og-image.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <Navbar />
              <ReferralCapture />
              <main className="pt-12 min-h-screen page-transition">
                <ReferralBanner />
                {children}
              </main>
              <Footer />
              <FirstVisitPrompt />
              <SignupBanner />
              <PWAInstallPrompt />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
