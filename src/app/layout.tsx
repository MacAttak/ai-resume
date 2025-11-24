import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Disclaimer } from '@/components/Disclaimer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Agent McCarthy - Interactive Career Agent',
  description:
    "Chat with Agent McCarthy, an AI powered by Daniel McCarthy's professional experience",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.className} pb-16 md:pb-12`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Disclaimer />
            <Toaster />
            <SpeedInsights />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
