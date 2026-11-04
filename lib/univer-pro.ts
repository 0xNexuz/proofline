// Univer licensed ("advanced") features for the Proofline workbook.
// Loaded with a dynamic import from UniverPanel only when Pro is enabled, so the
// open-source build keeps its smaller bundle and behaves exactly as before.
import type { FUniver } from '@univerjs/core/facade';
import type { FWorksheet } from '@univerjs/sheets/facade';
import { UniverSheetsAdvancedPreset } from '@univerjs/preset-sheets-advanced';
import UniverPresetSheetsAdvancedEnUS from '@univerjs/preset-sheets-advanced/locales/en-US';
import { UniverSheetsDrawingPreset } from '@univerjs/preset-sheets-drawing';
import UniverPresetSheetsDrawingEnUS from '@univerjs/preset-sheets-drawing/locales/en-US';
import '@univerjs/preset-sheets-drawing/lib/index.css';
import '@univerjs/preset-sheets-advanced/lib/index.css';

/**
 * The browser license (contents of Univer's license.txt). Univer's Web SDK is designed to
 * receive this in the client. The separate licenseKey.txt is a server secret and must never
 * be exposed through a NEXT_PUBLIC_ variable.
 */
export function proPresets(license: string) {
  return {
    // Order from Univer's docs: core (added by the caller), then drawing, then advanced.
    presets: [UniverSheetsDrawingPreset(), UniverSheetsAdvancedPreset(license ? { license } : {})],
    locales: [UniverPresetSheetsDrawingEnUS, UniverPresetSheetsAdvancedEnUS],
  };
}

export const BUDGET_CHART_TITLE = 'Budget vs actual';

/**
 * Inserts a column chart of the category summary block (header row 3, one row per category).
 * The chart reads the workbook's own Budget and Actual (formula) cells, so it follows edits live.
 * It is a visual aid: certified figures remain the independently verified claims.
 */
export async function insertBudgetChart(univerAPI: FUniver, sheet: FWorksheet, categoryCount: number) {
  if (categoryCount < 1) return null;
  for (const existing of sheet.getCharts()) await existing.remove();
  const lastRow = 3 + categoryCount;
  const info = sheet
    .newChart(univerAPI.Enum.ChartTypeString.Column)
    .setSource({ range: `A3:C${lastRow}`, orientation: univerAPI.Enum.ChartSourceOrientation.Columns })
    .setCategoryField(0)
    .setValueFields([1, 2])
    .setTitle(BUDGET_CHART_TITLE)
    .setPalette(['#8EA2C8', '#2B9A5A'])
    .setPosition('G3')
    .setSize(520, 300)
    .build();
  return sheet.insertChart(info);
}
