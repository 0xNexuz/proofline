export type PartKey = 'univer' | 'engine' | 'you' | 'antling';

export type Part = {
  key: PartKey;
  name: string;
  label: string;
  color: string;
  ink: string;
  text: string;
  status: 'Live' | 'Next';
  /** Quadrant start/end angles in SVG degrees (0 = east, clockwise). */
  from: number;
  to: number;
};

export const PARTS: Part[] = [
  {
    key: 'univer', name: 'Univer Sheets', label: 'Univer', color: '#2B9A5A', ink: '#FFFFFF', status: 'Live', from: -90, to: 0,
    text: 'The editable workbook. Cells, formulas, charts and saved versions run on Univer’s spreadsheet engine.',
  },
  {
    key: 'engine', name: 'Cent engine', label: 'Cent engine', color: '#2A93C2', ink: '#FFFFFF', status: 'Live', from: 0, to: 90,
    text: 'Recalculates every total in whole cents from the source rows, separately from the spreadsheet formulas.',
  },
  {
    key: 'you', name: 'Your approval', label: 'You', color: '#E4574A', ink: '#FFFFFF', status: 'Live', from: 90, to: 180,
    text: 'An edit puts totals on hold until they re-check. Deleting or moving rows keeps them on hold until a fresh import.',
  },
  {
    key: 'antling', name: 'Ant Ling', label: 'Ant Ling', color: '#F2AE2E', ink: '#1B1D22', status: 'Live', from: 180, to: 270,
    text: 'Drafts the report wording from checked totals only. Every figure is inserted by the cent engine.',
  },
];
