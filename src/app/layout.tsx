import type { Metadata } from "next";
import { Geist, Geist_Mono, Caveat, Lemonada } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

const lemonada = Lemonada({
  variable: "--font-lemonada",
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  title: "Bloub — Cozy AI Study Companion",
  description: "The aesthetic, mascot-powered study companion with highlighted notes, books, and flashcards.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="darkreader-lock" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = 'midnight';
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && key.endsWith('_bgTheme')) {
                    theme = localStorage.getItem(key) || 'midnight';
                    break;
                  }
                }
                let isDark = theme !== 'minimal';
                if (isDark) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', theme);
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`antialiased font-sans ${geistSans.variable} ${geistMono.variable} ${caveat.variable} ${lemonada.variable} bg-[#f8f9fa] text-gray-900 dark:bg-[#090b14] dark:text-gray-100 min-h-screen relative overflow-x-hidden transition-colors duration-500`}>
        {children}
      </body>
    </html>
  );
}
