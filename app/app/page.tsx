import type { Metadata } from 'next';
import Workspace from '@/components/Workspace';

export const metadata: Metadata = {
  title: 'ProofLine workspace',
  description: 'Import budgets and transactions into a Univer workbook and inspect independently checked totals.',
};

export default function WorkspacePage() { return <Workspace />; }
