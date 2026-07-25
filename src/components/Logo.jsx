import React from 'react';

// AisleFinder logo: top-down store map — four aisle bars (alternating full/faded)
// with a dashed route sweeping from bottom-left to an amber pin at top-right.
// Same artwork as public/logo.svg — keep the two in sync.
// Aisle/route/pin colors are set per theme via the .af-logo-* classes in AisleFinder.jsx;
// the pin dot matches the tile behind the logo so it reads as a cutout.
const Logo = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-label="AisleFinder logo" role="img">
    <rect className="af-logo-aisle" x="8" y="14" width="7" height="40" rx="3.5" fill="#1f5fa0"/>
    <rect className="af-logo-aisle" x="21" y="14" width="7" height="40" rx="3.5" fill="#1f5fa0" opacity="0.55"/>
    <rect className="af-logo-aisle" x="34" y="14" width="7" height="40" rx="3.5" fill="#1f5fa0"/>
    <rect className="af-logo-aisle" x="47" y="14" width="7" height="40" rx="3.5" fill="#1f5fa0" opacity="0.55"/>
    <path className="af-logo-route" d="M6 58 C13 46 19 50 24 39 C29 28 35 32 40 21" fill="none" stroke="#ffb52e" strokeWidth="2.4" strokeDasharray="2 5.4" strokeLinecap="round"/>
    <path className="af-logo-pin" d="M44 7 c3.7 0 5.9 2.7 5.9 5.6 C49.9 17.4 44 22.3 44 22.3 S38.1 17.4 38.1 12.6 C38.1 9.7 40.3 7 44 7 Z" fill="#ffb52e"/>
    <circle cx="44" cy="12.5" r="2" fill="var(--af-logo-tile, #ffffff)"/>
  </svg>
);

export default Logo;
