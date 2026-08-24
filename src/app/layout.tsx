import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      <body className="antialiased bg-[#f8f9fa] text-gray-900 dark:bg-[#090b14] dark:text-gray-100 min-h-screen relative overflow-x-hidden transition-colors duration-500">
        {/* Soft Organic Mesh Background (Dark Mode) */}
        <div className="fixed inset-0 pointer-events-none z-[-1] hidden dark:block opacity-60 mix-blend-screen">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/40 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/30 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
          <div className="absolute top-[30%] left-[50%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[100px]" />
        </div>
        {children}
      </body>
    </html>
  );
}
