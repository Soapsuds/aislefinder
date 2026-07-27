import React, { useState, useEffect, useRef } from 'react';
import { fetchItemDetails } from '../api';

// ---------------------------------------------------------------------------
// Label-buzzword glossary: what grocery label terms mean and don't mean.
// type: 'certification' = independent third-party audit;
//       'regulated'     = legally defined claim (USDA/FDA);
//       'marketing'     = no legal definition / unenforced.
// patterns detect the term on the item or product name; notWhen suppresses a
// match when a more specific term is present (e.g. "Certified Humane" should
// not also trigger the generic "Humane").
// ---------------------------------------------------------------------------
const BUZZWORDS = [
  {
    id: 'usda-organic',
    term: 'USDA Organic',
    type: 'regulated',
    patterns: [/\borganic\b/i],
    appliesTo: ['any'],
    means: 'Grown or raised without synthetic pesticides or fertilizers; animals get organic feed, no antibiotics or added hormones, and some outdoor access. USDA-audited.',
    doesntMean: "Pasture-raised, more nutritious, or high welfare standards — the required outdoor access can be minimal.",
  },
  {
    id: 'certified-humane',
    term: 'Certified Humane',
    type: 'certification',
    patterns: [/\bcertified humane\b/i],
    appliesTo: ['eggs', 'dairy', 'meat', 'poultry'],
    means: 'Audited by Humane Farm Animal Care: no cages for hens, no gestation crates, plus space and enrichment requirements.',
    doesntMean: 'Outdoor access — indoor barns qualify unless the label also says "Free Range" or "Pasture Raised".',
  },
  {
    id: 'gap',
    term: 'Animal Welfare Certified (GAP)',
    type: 'certification',
    patterns: [/\banimal welfare certified\b/i, /\bglobal animal partnership\b/i, /\bGAP\b/],
    appliesTo: ['eggs', 'meat', 'poultry'],
    means: "Global Animal Partnership's tiered, audited program (Steps 1–5+); higher steps mean outdoor and pasture access.",
    doesntMean: 'A high standard by itself — Step 1 is little more than no cages or crates. Check the step number.',
  },
  {
    id: 'american-humane',
    term: 'American Humane Certified',
    type: 'certification',
    patterns: [/\bamerican humane\b/i],
    appliesTo: ['eggs', 'dairy', 'meat', 'poultry'],
    means: 'Third-party audited welfare basics: food, water, air quality, and humane handling.',
    doesntMean: 'The strictest standard — its bar is lower than Certified Humane, and some caged and crowded systems still pass.',
  },
  {
    id: 'non-gmo',
    term: 'Non-GMO Project Verified',
    type: 'certification',
    patterns: [/\bnon[- ]?gmo\b/i],
    appliesTo: ['any'],
    means: 'Ingredients are verified to avoid genetically modified organisms.',
    doesntMean: 'Organic, pesticide-free, healthier, or anything about animal welfare.',
  },
  {
    id: 'cage-free',
    term: 'Cage-Free',
    type: 'regulated',
    patterns: [/\bcage[- ]free\b/i],
    appliesTo: ['eggs'],
    means: "Hens aren't kept in cages — they can walk, spread their wings, and lay in nest boxes.",
    doesntMean: 'Outdoor access — most cage-free hens live their whole lives indoors, often in crowded barns.',
  },
  {
    id: 'free-range',
    term: 'Free-Range',
    type: 'regulated',
    patterns: [/\bfree[- ]range\b/i, /\bfree[- ]roaming\b/i],
    appliesTo: ['eggs', 'poultry'],
    means: 'USDA requires the birds have some access to the outdoors.',
    doesntMean: "Time outside is guaranteed — the \"outdoors\" can be a small screened porch, and many birds never use it.",
  },
  {
    id: 'pasture-raised',
    term: 'Pasture-Raised',
    type: 'marketing',
    patterns: [/\bpasture[- ]raised\b/i],
    appliesTo: ['eggs', 'dairy', 'meat', 'poultry'],
    means: "Animals raised outdoors on pasture — the highest-welfare setup when it's actually verified.",
    doesntMean: 'Anything enforceable on its own — there is no legal definition. Meaningful when paired with Certified Humane (108 sq ft per hen) or Animal Welfare Approved.',
  },
  {
    id: 'grass-fed',
    term: 'Grass-Fed',
    type: 'marketing',
    patterns: [/\bgrass[- ]fed\b/i],
    appliesTo: ['dairy', 'meat'],
    means: 'Cattle ate grass and forage rather than grain, usually implying time on pasture.',
    doesntMean: 'A verified claim — the USDA withdrew its grass-fed standard in 2016. Look for "100% grass-fed" or a third-party certifier.',
  },
  {
    id: 'no-antibiotics',
    term: 'No Antibiotics Ever',
    type: 'regulated',
    patterns: [/\bno antibiotics\b/i, /\braised without antibiotics\b/i, /\bantibiotic[- ]free\b/i],
    appliesTo: ['eggs', 'dairy', 'meat', 'poultry'],
    means: 'The animal was never given antibiotics; the claim is USDA-reviewed.',
    doesntMean: 'Better living conditions — it says nothing about space, outdoor access, or humane treatment.',
  },
  {
    id: 'no-hormones',
    term: 'No Added Hormones',
    type: 'regulated',
    patterns: [/\bno (added )?hormones?\b/i, /\braised without (added )?hormones\b/i, /\bhormone[- ]free\b/i],
    appliesTo: ['dairy', 'meat'],
    means: 'No growth hormones were given — a meaningful claim on beef and dairy.',
    doesntMean: 'Anything on chicken, turkey, or pork — federal law already bans hormones there, so the label just restates the legal minimum.',
  },
  {
    id: 'humane',
    term: 'Humane / Humanely Raised',
    type: 'marketing',
    patterns: [/\bhumanely?\b/i],
    notWhen: [/\bcertified humane\b/i, /\bamerican humane\b/i],
    appliesTo: ['eggs', 'dairy', 'meat', 'poultry'],
    means: "Whatever the producer decides it means — there's no legal definition and no required audit.",
    doesntMean: 'Certified welfare standards. Trust it only alongside a certification like Certified Humane or Animal Welfare Certified.',
  },
  {
    id: 'natural',
    term: 'Natural',
    type: 'marketing',
    patterns: [/\bnatural\b/i],
    appliesTo: ['any'],
    means: 'For meat: minimally processed, no artificial ingredients. For everything else: almost nothing — the FDA has no definition.',
    doesntMean: 'Anything about how the animal lived, pesticides, hormones, or health. One of the least meaningful words on a label.',
  },
  {
    id: 'farm-fresh',
    term: 'Farm Fresh',
    type: 'marketing',
    patterns: [/\bfarm[- ]fresh\b/i],
    appliesTo: ['eggs', 'dairy'],
    means: "Nothing — it's imagery, not a standard. Every egg comes from a farm.",
    doesntMean: 'Small farms, freshness, or better welfare.',
  },
  {
    id: 'vegetarian-fed',
    term: 'Vegetarian-Fed',
    type: 'marketing',
    patterns: [/\bvegetarian[- ]fed\b/i],
    appliesTo: ['eggs', 'poultry'],
    means: 'The feed contained no animal by-products.',
    doesntMean: 'Better welfare — chickens are natural omnivores that eat insects, so this describes the feed, not the living conditions.',
  },
  {
    id: 'local',
    term: 'Local',
    type: 'marketing',
    patterns: [/\blocal(ly)?\b/i],
    appliesTo: ['any'],
    means: "Usually that the food traveled a shorter distance — but there's no legal definition of how far.",
    doesntMean: "Small-scale, organic, or humane. A factory farm 50 miles away is still \"local\".",
  },
];

const CATEGORY_MATCHERS = [
  { category: 'eggs',    patterns: [/\beggs?\b/i] },
  { category: 'dairy',   patterns: [/\bmilk\b/i, /\bhalf[- ]and[- ]half\b/i, /\bskim\b/i, /\bbutter\b/i, /\bcheese\b/i, /\bcheddar\b/i, /\bmozzarella\b/i, /\bparmesan\b/i, /\bgouda\b/i, /\bbrie\b/i, /\byogh?urt\b/i, /\bcream\b/i] },
  { category: 'poultry', patterns: [/\bchicken\b/i, /\bturkey\b/i] },
  { category: 'meat',    patterns: [/\bbeef\b/i, /\bsteak\b/i, /\bbrisket\b/i, /\bpork\b/i, /\bbacon\b/i, /\bham\b/i, /\bsausage\b/i, /\blamb\b/i] },
];

// Terms detected on the item/product name come first (onLabel: true), followed
// by the other terms worth knowing for the item's category. Empty array = no card.
export function getRelevantBuzzwords(itemName, productName) {
  if (!itemName) return [];
  const haystack = [itemName, productName].filter(Boolean).join(' ');
  const matched = CATEGORY_MATCHERS.find(({ patterns }) => patterns.some(rx => rx.test(itemName)));
  const category = matched ? matched.category : null;
  const results = [];
  for (const word of BUZZWORDS) {
    const onLabel = word.patterns.some(rx => rx.test(haystack))
      && !(word.notWhen && word.notWhen.some(rx => rx.test(haystack)));
    const relevant = onLabel
      || (category && (word.appliesTo.includes(category) || word.appliesTo.includes('any')));
    if (relevant) results.push({ ...word, onLabel });
  }
  results.sort((a, b) => Number(b.onLabel) - Number(a.onLabel));
  return results;
}

const TYPE_META = {
  certification: {
    label: 'Certification',
    background: 'rgba(31,95,160,0.13)',
    border: '1px solid rgba(31,95,160,0.28)',
    color: 'var(--af-green-dark)',
  },
  regulated: {
    label: 'Regulated',
    background: 'rgba(31,95,160,0.07)',
    border: '1px solid rgba(31,95,160,0.18)',
    color: 'var(--af-green-dark)',
  },
  marketing: {
    label: 'Marketing term',
    background: 'var(--af-inset-bg)',
    border: '1px solid var(--af-border)',
    color: 'var(--af-text-muted)',
  },
};

const TypeBadge = ({ type }) => {
  const meta = TYPE_META[type];
  return (
    <span style={{
      flexShrink: 0,
      padding: '2px 8px',
      borderRadius: '20px',
      fontSize: '10px',
      fontWeight: 700,
      letterSpacing: '0.3px',
      background: meta.background,
      color: meta.color,
      border: meta.border,
      whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  );
};

const LabelDecoder = ({ words }) => {
  const [expandedId, setExpandedId] = useState(null);
  return (
    <div style={{
      marginTop: '14px',
      padding: '13px 14px 3px',
      background: 'var(--af-highlight-bg)',
      border: '1px solid var(--af-highlight-border)',
      borderRadius: '10px',
      textAlign: 'left',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
        <i className="fa-solid fa-tags" style={{ color: 'var(--af-green)', fontSize: '13px' }} />
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.4px', color: 'var(--af-green-dark)', textTransform: 'uppercase' }}>
          What the labels mean
        </span>
      </div>
      {words.map((word, i) => {
        const expanded = expandedId === word.id;
        return (
          <div key={word.id} style={{ borderTop: i > 0 ? '1px solid var(--af-highlight-border)' : 'none' }}>
            <button
              onClick={() => setExpandedId(expanded ? null : word.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                width: '100%',
                background: 'none',
                border: 'none',
                padding: '9px 0',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--af-text)', flex: 1, lineHeight: 1.3 }}>
                {word.term}
                {word.onLabel && (
                  <i
                    className="fa-solid fa-circle-check"
                    title="On this label"
                    style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--af-green)' }}
                  />
                )}
              </span>
              <TypeBadge type={word.type} />
              <i
                className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'}`}
                style={{ fontSize: '10px', color: 'var(--af-text-faint)', flexShrink: 0 }}
              />
            </button>
            {expanded && (
              <div style={{ padding: '0 0 10px', fontSize: '12px', lineHeight: 1.5 }}>
                <div style={{ color: 'var(--af-text-muted)', marginBottom: '5px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--af-text)' }}>Means: </span>
                  {word.means}
                </div>
                <div style={{ color: 'var(--af-text-muted)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--af-text)' }}>Doesn't mean: </span>
                  {word.doesntMean}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const SHELF_ROWS = 5;
const BAY_COLS = 5;

// Grid diagram: rows = shelf levels, columns = bay positions.
// The target cell is highlighted; the intersecting row+col are lightly tinted.
const AisleDiagram = ({ location }) => {
  const targetShelf = location.shelf ? parseInt(location.shelf, 10) : null;
  const targetBay = location.bay ? parseInt(location.bay, 10) : null;
  const isLeft = location.side === 'L';
  const isRight = location.side === 'R';
  const sideLabel = isLeft ? 'Left side' : isRight ? 'Right side' : null;

  // Keep target bay visible; center the window around it when possible
  let bayStart = 1;
  if (targetBay) {
    bayStart = Math.max(1, targetBay - Math.floor(BAY_COLS / 2));
  }
  const bays = Array.from({ length: BAY_COLS }, (_, i) => bayStart + i);
  const shelves = Array.from({ length: SHELF_ROWS }, (_, i) => i + 1);

  return (
    <div style={{
      marginTop: '14px',
      padding: '12px 14px',
      background: 'var(--af-highlight-bg)',
      border: '1px solid var(--af-highlight-border)',
      borderRadius: '10px',
    }}>
      {/* Aisle + side header */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        {location.aisle && (
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--af-green-dark)' }}>
            <i className="fa-solid fa-location-dot" style={{ marginRight: '6px' }} />
            Aisle {location.aisle}
          </span>
        )}
        {sideLabel && (
          <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--af-text-muted)', fontWeight: 500 }}>
            · {sideLabel}
          </span>
        )}
      </div>

      {/* Column (bay) header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `20px repeat(${BAY_COLS}, 1fr)`,
        gap: '3px',
        marginBottom: '3px',
      }}>
        <div style={{ fontSize: '8px', color: 'var(--af-text-faint)', display: 'flex', alignItems: 'flex-end', paddingBottom: '1px' }}>
          Sh
        </div>
        {bays.map((bay) => (
          <div key={bay} style={{
            textAlign: 'center',
            fontSize: '9px',
            fontWeight: bay === targetBay ? 700 : 400,
            color: bay === targetBay ? 'var(--af-green-dark)' : 'var(--af-text-faint)',
          }}>
            {bay}
          </div>
        ))}
      </div>

      {/* Shelf rows × bay columns */}
      {shelves.map((shelf) => (
        <div key={shelf} style={{
          display: 'grid',
          gridTemplateColumns: `20px repeat(${BAY_COLS}, 1fr)`,
          gap: '3px',
          marginBottom: '3px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: '3px',
            fontSize: '9px',
            fontWeight: shelf === targetShelf ? 700 : 400,
            color: shelf === targetShelf ? 'var(--af-green-dark)' : 'var(--af-text-faint)',
          }}>
            {shelf}
          </div>
          {bays.map((bay) => {
            const isTarget = shelf === targetShelf && bay === targetBay;
            return (
              <div key={bay} style={{
                height: '24px',
                borderRadius: '4px',
                backgroundColor: isTarget ? 'var(--af-green)' : 'var(--af-inset-bg)',
                border: `1px solid ${isTarget ? 'var(--af-green)' : 'var(--af-border)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {isTarget && (
                  <i className="fa-solid fa-location-dot" style={{ color: 'white', fontSize: '12px' }} />
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Bay range axis label */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '4px',
        fontSize: '9px',
        color: 'var(--af-text-faint)',
        paddingLeft: '23px',
      }}>
        <span>
          <i className="fa-solid fa-chevron-left" style={{ fontSize: '7px', marginRight: '2px' }} />
          Bay {bayStart}
        </span>
        <span>
          Bay {bayStart + BAY_COLS - 1}
          <i className="fa-solid fa-chevron-right" style={{ fontSize: '7px', marginLeft: '2px' }} />
        </span>
      </div>

      {location.description && (
        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '11px', color: 'var(--af-text-faint)', fontStyle: 'italic' }}>
          {location.description}
        </div>
      )}
    </div>
  );
};

// Centered popup (not a bottom sheet) showing product photo, full name/brand/size,
// and an in-aisle shelf×bay grid. Opened from the info icon in shop mode.
const ItemInfoSheet = ({ item, store, onClose }) => {
  const [state, setState] = useState({ status: 'idle' });
  const [resultIndex, setResultIndex] = useState(0);
  const cache = useRef({});

  useEffect(() => {
    setResultIndex(0);
    if (!item) return;
    const key = `${store ? store.id : 'default'}::${item.toLowerCase()}`;
    if (key in cache.current) {
      setState({ status: 'done', results: cache.current[key] });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });
    fetchItemDetails({ item, store })
      .then((results) => {
        cache.current[key] = results;
        if (!cancelled) setState({ status: 'done', results });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => { cancelled = true; };
  }, [item, store]);

  if (!item) return null;

  const results = state.status === 'done' ? state.results : [];
  const details = results[resultIndex] || null;
  const location = details && details.location;
  const subtitle = details
    && [details.brand, details.size, details.category].filter(Boolean).join(' · ');
  const buzzwords = getRelevantBuzzwords(item, details && details.name);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--af-backdrop)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{
        background: 'var(--af-popup-bg)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: 'var(--af-shadow-lg)',
        width: '100%',
        maxWidth: '340px',
        maxHeight: '85vh',
        overflowY: 'auto',
        position: 'relative',
        animation: 'popupZoomIn 0.18s ease',
        color: 'var(--af-text)',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--af-text-muted)',
            fontSize: '16px',
            padding: '4px 6px',
            borderRadius: '6px',
            lineHeight: 1,
          }}
        >
          <i className="fa-solid fa-xmark" />
        </button>

        <div style={{ textAlign: 'center', minHeight: '120px', paddingRight: '20px' }}>
          {buzzwords.length > 0 && <LabelDecoder words={buzzwords} />}

          {state.status === 'loading' && (
            <div style={{ padding: '30px 0', color: 'var(--af-text-muted)', fontSize: '13px' }}>
              <div className="loading-icon-0" style={{ fontSize: '22px', color: 'var(--af-green)', marginBottom: '10px' }}>
                <i className="fa-solid fa-magnifying-glass" />
              </div>
              Looking up {item}…
            </div>
          )}

          {state.status === 'error' && (
            <div style={{ padding: '30px 0', color: 'var(--af-error-text)', fontSize: '13px' }}>
              Couldn't load details — check your connection and try again.
            </div>
          )}

          {state.status === 'done' && results.length === 0 && (
            <div style={{ padding: '30px 0 14px', color: 'var(--af-text-muted)', fontSize: '13px' }}>
              No match for this item at {store ? store.name : 'this store'}.
            </div>
          )}

          {details && (
            <>
              {details.image && (
                <div style={{
                  background: 'white',
                  border: '1px solid var(--af-border)',
                  borderRadius: '14px',
                  padding: '12px',
                  display: 'inline-block',
                  marginBottom: '14px',
                  marginTop: buzzwords.length > 0 ? '14px' : '0',
                }}>
                  <img
                    src={details.image}
                    alt={details.name}
                    style={{ maxWidth: '160px', maxHeight: '160px', display: 'block' }}
                  />
                </div>
              )}

              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--af-text)', lineHeight: 1.3 }}>
                {details.name}
              </div>
              {subtitle && (
                <div style={{ fontSize: '12px', color: 'var(--af-text-muted)', marginTop: '5px' }}>
                  {subtitle}
                </div>
              )}

              {location ? (
                <AisleDiagram location={location} />
              ) : (
                <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--af-text-muted)' }}>
                  <i className="fa-solid fa-circle-info" style={{ marginRight: '5px' }} />
                  Exact location unavailable
                  {details.category ? ` — look in ${details.category}` : ''}
                </div>
              )}

              {results.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginTop: '14px' }}>
                  <button
                    onClick={() => setResultIndex((i) => i - 1)}
                    disabled={resultIndex === 0}
                    style={{ background: 'none', border: 'none', cursor: resultIndex === 0 ? 'default' : 'pointer', color: resultIndex === 0 ? 'var(--af-text-faint)' : 'var(--af-text-muted)', fontSize: '16px', padding: '4px 8px' }}
                  >
                    <i className="fa-solid fa-chevron-left" />
                  </button>
                  <span style={{ fontSize: '12px', color: 'var(--af-text-muted)', minWidth: '40px', textAlign: 'center' }}>
                    {resultIndex + 1} / {results.length}
                  </span>
                  <button
                    onClick={() => setResultIndex((i) => i + 1)}
                    disabled={resultIndex === results.length - 1}
                    style={{ background: 'none', border: 'none', cursor: resultIndex === results.length - 1 ? 'default' : 'pointer', color: resultIndex === results.length - 1 ? 'var(--af-text-faint)' : 'var(--af-text-muted)', fontSize: '16px', padding: '4px 8px' }}
                  >
                    <i className="fa-solid fa-chevron-right" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemInfoSheet;
