import type { Metadata } from 'next';
import './globals.css';
import './p1.css';
import './p2.css';

export const metadata: Metadata = {
  title: 'Proofline — Financial evidence workspace',
  description: 'Univer-powered, evidence-first financial reporting prototype.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
