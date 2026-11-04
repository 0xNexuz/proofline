import type { Metadata } from 'next';
import '@fontsource-variable/newsreader';
import '@fontsource-variable/inter-tight';
import Workspace from '@/components/Workspace';
import './workspace.css';

export const metadata: Metadata = {
  title: 'ProofLine workspace',
  description: 'Import budgets and transactions into a Univer workbook and inspect independently checked totals.',
};

export default function WorkspacePage() { return <Workspace />; }
