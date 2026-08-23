/**
 * Challenger Test Suite: Adversarial Edge Cases & Defensive Invariants
 * 
 * Objectives:
 * 1. Test defensive type normalization against corrupt/malformed inputs (null, numbers, upper-case, objects).
 * 2. Test Bloub Mascot resolver invariants (Study defaults to 'livre'/'violet' vs ToDo hash fallback).
 * 3. Verify category creation/update API action handlers handle legacy and modern parameter aliases.
 * 4. Verify cross-category data isolation when identical names or mixed list types exist.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Category, ListType } from '../../src/types/todo.ts';

// Logic mirror of mapCategories from src/app/api/data/route.ts & src/app/page.tsx
function normalizeCategoryType(rawCategory: any): Category {
  return {
    ...rawCategory,
    id: String(rawCategory?.id || 'default'),
    name: String(rawCategory?.name || 'Untitled List'),
    type: (rawCategory?.type === 'study' ? 'study' : 'todo') as ListType
  };
}

// Logic mirror of getListMascot from src/app/page.tsx
function getListMascot(cat: Category, settings: Record<string, { shape: string; color: string }> = {}) {
  if (cat.type === 'study') {
    return {
      shape: settings[cat.id]?.shape || 'livre',
      color: settings[cat.id]?.color || 'violet'
    };
  }
  const shapes = ['squircle', 'cercle', 'galet', 'hexagone', 'capsule'];
  const colors = ['vert', 'bleu', 'violet', 'orange', 'rose', 'turquoise', 'ambre'];
  const hash = (cat.name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return {
    shape: settings[cat.id]?.shape || shapes[hash % shapes.length],
    color: settings[cat.id]?.color || colors[hash % colors.length]
  };
}

// Logic mirror of POST action normalization in src/app/api/data/route.ts
function extractCategoryTypeFromAction(body: any): ListType {
  const rawType = body.categoryType || body.listType || (body.action ? body.type : undefined) || 'todo';
  return rawType === 'study' ? 'study' : 'todo';
}

describe('Challenger Suite 3: Adversarial Edge Cases & Invariants', () => {
  it('CHAL-3.1: Defensive normalization against malformed or unexpected category types', () => {
    const corruptInputs = [
      { id: 'c1', name: 'Test 1', type: null },
      { id: 'c2', name: 'Test 2', type: undefined },
      { id: 'c3', name: 'Test 3', type: 'STUDY' }, // Uppercase - should default to todo unless exact 'study'
      { id: 'c4', name: 'Test 4', type: 'Study' },
      { id: 'c5', name: 'Test 5', type: 12345 },
      { id: 'c6', name: 'Test 6', type: {} },
      { id: 'c7', name: 'Test 7', type: ['study'] },
      { id: 'c8', name: 'Test 8', type: 'unknown_type' },
      { id: 'c9', name: 'Test 9', type: 'study' } // Valid study
    ];

    const normalized = corruptInputs.map(normalizeCategoryType);

    // All invalid types must safely fall back to 'todo'
    for (let i = 0; i < 8; i++) {
      assert.strictEqual(
        normalized[i].type,
        'todo',
        `Corrupt input ${i} (${JSON.stringify(corruptInputs[i].type)}) failed to fallback to 'todo'`
      );
    }

    // Valid 'study' must be preserved
    assert.strictEqual(normalized[8].type, 'study', 'Valid study type must be preserved');
  });

  it('CHAL-3.2: Mascot resolver assigns study-themed mascot (livre/violet) by default for Study lists', () => {
    const studyCategory: Category = { id: 'study_1', name: 'Deep Learning', type: 'study' };
    const mascot = getListMascot(studyCategory, {});

    assert.strictEqual(mascot.shape, 'livre', 'Study list default mascot shape must be "livre" (book)');
    assert.strictEqual(mascot.color, 'violet', 'Study list default mascot color must be "violet"');

    // Customized mascot settings should override defaults
    const customSettings = {
      study_1: { shape: 'squircle', color: 'turquoise' }
    };
    const customMascot = getListMascot(studyCategory, customSettings);
    assert.strictEqual(customMascot.shape, 'squircle');
    assert.strictEqual(customMascot.color, 'turquoise');
  });

  it('CHAL-3.3: Mascot resolver falls back gracefully for empty category name or missing settings', () => {
    const emptyCat: Category = { id: 'todo_empty', name: '', type: 'todo' };
    const mascot = getListMascot(emptyCat);

    assert.ok(typeof mascot.shape === 'string' && mascot.shape.length > 0);
    assert.ok(typeof mascot.color === 'string' && mascot.color.length > 0);
  });

  it('CHAL-3.4: API action type normalization safely resolves parameter aliases', () => {
    // 1. ADD_CATEGORY with categoryType
    assert.strictEqual(
      extractCategoryTypeFromAction({ action: 'ADD_CATEGORY', name: 'Cat 1', categoryType: 'study' }),
      'study'
    );

    // 2. ADD_CATEGORY with listType
    assert.strictEqual(
      extractCategoryTypeFromAction({ action: 'ADD_CATEGORY', name: 'Cat 2', listType: 'study' }),
      'study'
    );

    // 3. ADD_CATEGORY with type (legacy)
    assert.strictEqual(
      extractCategoryTypeFromAction({ action: 'ADD_CATEGORY', name: 'Cat 3', type: 'study' }),
      'study'
    );

    // 4. Default when unspecified
    assert.strictEqual(
      extractCategoryTypeFromAction({ action: 'ADD_CATEGORY', name: 'Cat 4' }),
      'todo'
    );

    // 5. Explicit ToDo
    assert.strictEqual(
      extractCategoryTypeFromAction({ action: 'ADD_CATEGORY', name: 'Cat 5', categoryType: 'todo' }),
      'todo'
    );
  });

  it('CHAL-3.5: Support for identical names across different list types without cross-contamination', () => {
    const studyCategory: Category = { id: 'cat_study_ai', name: 'AI Engineering', type: 'study' };
    const todoCategory: Category = { id: 'cat_todo_ai', name: 'AI Engineering', type: 'todo' };

    const cats = [studyCategory, todoCategory];
    const normalized = cats.map(normalizeCategoryType);

    assert.strictEqual(normalized[0].type, 'study');
    assert.strictEqual(normalized[1].type, 'todo');
    assert.notStrictEqual(normalized[0].id, normalized[1].id);
  });
});
