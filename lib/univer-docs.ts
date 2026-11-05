// Univer Docs editor for the approved-report workflow. Loaded lazily by ReportEditor.
import { UniverDocsCorePreset } from '@univerjs/preset-docs-core';
import UniverPresetDocsCoreEnUS from '@univerjs/preset-docs-core/locales/en-US';
import { BooleanNumber, createUniver, LocaleType, mergeLocales, NamedStyleType } from '@univerjs/presets';
import '@univerjs/preset-docs-core/lib/index.css';

export type ReportBlock = { kind: 'heading' | 'paragraph' | 'note'; text: string };
export type ReportContent = { title: string; blocks: ReportBlock[] };
export type ReportHandle = { readText: () => string; dispose: () => void };

/** Mounts a Univer document in `container`, filled with the report, and returns a reader for its current text. */
export function mountReport(container: HTMLElement, content: ReportContent): ReportHandle {
  const { univer, univerAPI } = createUniver({
    locale: LocaleType.EN_US,
    locales: { [LocaleType.EN_US]: mergeLocales(UniverPresetDocsCoreEnUS) },
    presets: [UniverDocsCorePreset({ container })],
  });
  // A compact page so the whole line fits beside the check panel without sideways scrolling.
  const doc = univerAPI.createDocument({
    documentStyle: { pageSize: { width: 640, height: 900 }, marginTop: 48, marginBottom: 48, marginLeft: 52, marginRight: 52, autoHyphenation: BooleanNumber.FALSE },
  });
  const first = doc.getParagraphs()[0] ?? doc.appendParagraph('');
  first.setText(content.title);
  first.setStyle({ namedStyleType: NamedStyleType.HEADING_1 });
  for (const block of content.blocks) {
    const paragraph = doc.appendParagraph(block.text);
    if (block.kind === 'heading') paragraph.setStyle({ namedStyleType: NamedStyleType.HEADING_2 });
    if (block.kind === 'note') paragraph.getTextRange().setTextStyle({ it: BooleanNumber.TRUE, cl: { rgb: '#5D6270' } });
  }
  return {
    readText: () => doc.getParagraphs().map(paragraph => paragraph.getText()).join('\n'),
    dispose: () => univer.dispose(),
  };
}
