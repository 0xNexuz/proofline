import Link from 'next/link';
import '@fontsource-variable/newsreader';
import '@fontsource-variable/inter-tight';
import HeroArt from './HeroArt';
import TracePill from './TracePill';
import { PARTS } from './parts';

const FACTS = [
  { title: 'Univer Sheets 1.3.1', text: 'Licensed SDK with real cells, formulas and charts', icon: 'grid' },
  { title: '35 automated tests', text: 'Parsing, edits, ownership, audit and AI drafts', icon: 'check' },
  { title: 'Whole-cent maths', text: 'Totals never rely on floating point', icon: 'cent' },
  { title: 'Saved versions', text: 'Private, with an append-only audit trail', icon: 'stack' },
] as const;


function FactIcon({ name }: { name: (typeof FACTS)[number]['icon'] }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      {name === 'grid' && <><rect x="5" y="7" width="22" height="18" rx="3" /><path d="M5 13h22M12 7v18M19 7v18" /></>}
      {name === 'check' && <><circle cx="16" cy="16" r="11" /><path d="M11 16.5l3.5 3.5l7 -8" /></>}
      {name === 'cent' && <><circle cx="16" cy="16" r="11" /><path d="M19.5 12a5 5 0 1 0 0 8M15.5 8.5v15" /></>}
      {name === 'stack' && <><path d="M16 5l11 6l-11 6l-11 -6z" /><path d="M5 16l11 6l11 -6M5 21l11 6l11 -6" /></>}
    </svg>
  );
}

function PieceGlyph({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className="lp-piece">
      <path d="M4 24V4h20a20 20 0 0 1-20 20z" fill={color} />
      <circle cx="14" cy="4" r="3.6" fill={color} />
    </svg>
  );
}

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-hero">
        <nav className="lp-nav" aria-label="Main">
          <Link href="/" className="lp-brand" aria-label="ProofLine home">PROOFLINE<span>.</span></Link>
          <div className="lp-nav-links">
            <a href="#how">How it works</a>
            <Link href="/app" className="lp-btn lp-btn-light">Open workspace</Link>
          </div>
        </nav>

        <div className="lp-hero-grid">
          <div className="lp-hero-copy">
            <h1>Totals you can trace back to the receipt.</h1>
            <p className="lp-lede">Budgets and transactions become a live Univer workbook. Every total is re-checked to the cent whenever a cell changes, and every figure links back to the rows it came from.</p>
            <TracePill />
            <div className="lp-ctas">
              <Link href="/app" className="lp-btn lp-btn-light">Open the workspace</Link>
              <a href="#how" className="lp-btn lp-btn-ghost">See how it works</a>
            </div>
            <p className="lp-note">Try it with sample data. No account needed.</p>
          </div>
          <HeroArt />
        </div>
      </header>

      <main>
        <section className="lp-how" id="how" aria-labelledby="how-title">
          <div className="lp-wrap lp-how-grid">
            <div className="lp-how-intro">
              <h2 id="how-title">Four parts, and only one of them certifies the numbers.</h2>
              <p>The spreadsheet is for editing. The cent engine is for checking. Ant Ling only writes words, and every figure in those words comes from a checked total.</p>
            </div>
            <ul className="lp-parts">
              {PARTS.map(part => (
                <li key={part.key}>
                  <PieceGlyph color={part.color} />
                  <div>
                    <h3>{part.name}</h3>
                    <p>{part.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="lp-wrap">
            <ul className="lp-facts" aria-label="Key facts">
              {FACTS.map(fact => (
                <li key={fact.title}><FactIcon name={fact.icon} /><strong>{fact.title}</strong><span>{fact.text}</span></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="lp-build" id="try" aria-label="Try ProofLine">
          <div className="lp-wrap">
            <div className="lp-cta-band">
              <p>See a total re-check itself. Load the sample budget, change one amount, and open the claim it affects.</p>
              <Link href="/app" className="lp-btn lp-btn-light">Open the workspace</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap">
          <span className="lp-brand">PROOFLINE<span>.</span></span>
          <p>Spreadsheet editing and charts by Univer. Checking, sources and storage by ProofLine. Report wording by Ant Ling. The demo uses synthetic data only.</p>
        </div>
      </footer>
    </div>
  );
}
