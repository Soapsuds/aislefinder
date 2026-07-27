import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import ItemInfoSheet, { getRelevantBuzzwords } from './ItemInfoSheet';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../api', () => ({
  fetchItemDetails: jest.fn(),
}));

const { fetchItemDetails } = require('../api');

const render = async (item) => {
  const div = document.createElement('div');
  document.body.appendChild(div);
  await act(async () => {
    createRoot(div).render(
      <ItemInfoSheet item={item} store={{ id: '123', name: 'Test Store' }} onClose={() => {}} />
    );
  });
  return div;
};

const click = (el) =>
  act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

beforeEach(() => {
  document.body.innerHTML = '';
  fetchItemDetails.mockResolvedValue([]);
});

describe('getRelevantBuzzwords', () => {
  test('eggs get the egg-label glossary with nothing marked on-label', () => {
    const words = getRelevantBuzzwords('eggs');
    const ids = words.map(w => w.id);
    expect(ids).toEqual(expect.arrayContaining(['cage-free', 'free-range', 'pasture-raised', 'usda-organic']));
    expect(words.every(w => !w.onLabel)).toBe(true);
  });

  test('terms detected on the product name come first, flagged onLabel', () => {
    const words = getRelevantBuzzwords('milk', 'Horizon Organic Whole Milk');
    expect(words[0].id).toBe('usda-organic');
    expect(words[0].onLabel).toBe(true);
    expect(words.slice(1).every(w => !w.onLabel)).toBe(true);
    expect(words.slice(1).some(w => w.id === 'grass-fed')).toBe(true);
  });

  test('detects multiple terms on one label', () => {
    const words = getRelevantBuzzwords('eggs', 'Simple Truth Organic Cage Free Eggs');
    const onLabel = words.filter(w => w.onLabel).map(w => w.id);
    expect(onLabel).toEqual(expect.arrayContaining(['usda-organic', 'cage-free']));
  });

  test('egg-only terms are not suggested for milk', () => {
    const words = getRelevantBuzzwords('milk');
    expect(words.map(w => w.id)).not.toContain('cage-free');
  });

  test('"Certified Humane" does not also trigger the generic "Humane" term as on-label', () => {
    const words = getRelevantBuzzwords('chicken', 'Smart Chicken Certified Humane Boneless Breasts');
    const certified = words.find(w => w.id === 'certified-humane');
    const generic = words.find(w => w.id === 'humane');
    expect(certified.onLabel).toBe(true);
    expect(generic.onLabel).toBe(false);
  });

  test('unmatched items get no glossary', () => {
    expect(getRelevantBuzzwords('paper towels')).toEqual([]);
    expect(getRelevantBuzzwords('')).toEqual([]);
    expect(getRelevantBuzzwords(null)).toEqual([]);
  });

  test('marketing terms are detected on unmatched items when actually on the name', () => {
    const words = getRelevantBuzzwords('salsa', 'Simple Truth Organic Salsa');
    expect(words.map(w => w.id)).toEqual(['usda-organic']);
    expect(words[0].onLabel).toBe(true);
  });
});

describe('ItemInfoSheet label decoder', () => {
  test('shows the decoder with expandable definitions and marks on-label terms', async () => {
    fetchItemDetails.mockResolvedValueOnce([
      { name: 'Simple Truth Organic Cage Free Eggs', brand: 'Simple Truth', size: '12 ct', category: 'Dairy', image: null, location: null },
    ]);
    const div = await render('eggs');

    expect(div.textContent).toContain('What the labels mean');
    expect(div.textContent).toContain('Cage-Free');
    expect(div.textContent).not.toContain("Doesn't mean");

    const row = [...div.querySelectorAll('button')].find(b => b.textContent.includes('Cage-Free'));
    await click(row);
    expect(div.textContent).toContain('Outdoor access — most cage-free hens');

    // Terms found on the product name carry the on-label check icon
    expect(row.querySelector('.fa-circle-check')).not.toBeNull();
  });

  test('shows no decoder for items with no relevant terms', async () => {
    const div = await render('paper towels');
    expect(div.textContent).not.toContain('What the labels mean');
  });
});
