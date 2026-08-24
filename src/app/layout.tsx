import type { Metadata } from "next";
import { Geist, Geist_Mono, Caveat, Aref_Ruqaa } from "next/font/google";
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

const arefRuqaa = Aref_Ruqaa({
  variable: "--font-aref-ruqaa",
  weight: ["400", "700"],
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  title: "Vibe Todos",
  description: "A premium AI-powered todo app.",
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
      <body className={`antialiased ${geistSans.variable} ${geistMono.variable} ${caveat.variable} ${arefRuqaa.variable} bg-[#f8f9fa] text-gray-900 dark:bg-[#090b14] dark:text-gray-100 min-h-screen relative overflow-x-hidden transition-colors duration-500`}>
        {children}
      </body>
    </html>
  );
}
