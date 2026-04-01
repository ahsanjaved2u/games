import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FirstVisitPrompt from "@/components/FirstVisitPrompt";
import SignupBanner from "@/components/SignupBanner";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

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
  description: 'GameVesta is a skill-based browser gaming platform. Play free and paid HTML5 games, earn real cash rewards, and compete with players for prize pools — all in PKR.',
  keywords: ['browser games', 'skill games', 'earn money playing games', 'online gaming Pakistan', 'compete win cash', 'GameVesta', 'gamevesta.com', 'real money games PKR'],
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
    description: 'Skill-based browser gaming platform. Earn real cash rewards by playing HTML5 games and competing in prize pools.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'GameVesta — Play. Compete. Win.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GameVesta — Play. Compete. Win.',
    description: 'Skill-based browser gaming platform. Earn real cash rewards by playing HTML5 games.',
    images: ['/og-image.png'],
    creator: '@gamevesta',
  },
  alternates: {
    canonical: 'https://gamevesta.com',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'GameVesta',
  url: 'https://gamevesta.com',
  description: 'Skill-based browser gaming platform where players earn real cash rewards in PKR.',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://gamevesta.com/games?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'GameVesta',
  url: 'https://gamevesta.com',
  logo: 'https://gamevesta.com/og-image.png',
  description: 'GameVesta is a skill-based browser gaming platform. Play HTML5 games, earn real PKR cash rewards, and compete in prize pools.',
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
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
            <main className="pt-12 min-h-screen">
              {children}
            </main>
            <Footer />
            <FirstVisitPrompt />
            <SignupBanner />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
