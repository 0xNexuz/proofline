import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ProofLine',
  description: 'Univer-powered, evidence-first financial reporting prototype.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
