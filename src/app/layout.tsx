import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AnimatedGradientCSS } from '@/components/ui/AnimatedGradient';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Promethean',
  description: 'The Ascendant Agent',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {/* Animated background gradient */}
        <AnimatedGradientCSS />
        
        {/* Main content with higher z-index */}
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
} 