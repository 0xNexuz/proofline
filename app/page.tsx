import type { Metadata } from 'next';
import Landing from '@/components/landing/Landing';
import './landing.css';

export const metadata: Metadata = {
  title: 'ProofLine — totals you can trace',
  description: 'ProofLine turns budgets and transactions into a live Univer workbook and re-checks every total to the cent. Follow the build.',
};

export default function Home() { return <Landing />; }
