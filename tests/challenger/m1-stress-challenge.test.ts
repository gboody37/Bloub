/**
 * Challenger M1 Empirical Stress & Property Test Suite
 * 
 * Verifies correctness, edge cases, rapid switching, backward compatibility,
 * concurrency collisions, mutation edge cases, and UI segregation contracts.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCategoryLogic, getUIRenderContract } from '../verification/verify-ac1-list-types.ts';
import type { Category, ListType, Todo } from '../../src/types/todo.ts';

// Helper mapping logic matching src/app/api/data/route.ts
const mapCategories = (categories: any[]): Category[] => categories.map(c => ({
  ...c,
  type: (c.type === 'study' ? 'study' : 'todo') as ListType
}));

// Simulated API handler logic from src/app/api/data/route.ts
class MockDatabaseState {
  categories: Category[] = [
    { id: 'default', name: 'General', type: 'todo' }
  ];
  todos: Todo[] = [];

  handleRequest(body: any): { todos: Todo[]; categories: Category[] } {
    const action = body.action || body.type;

    if (action === 'ADD_CATEGORY') {
      const rawType = body.categoryType || body.listType || (body.action ? body.type : undefined) || 'todo';
      const categoryType: ListType = rawType === 'study' ? 'study' : 'todo';
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) return { todos: this.todos, categories: mapCategories(this.categories) };

      const newCat: Category = {
        id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name,
        type: categoryType
      };
      this.categories.push(newCat);
    } else if (action === 'UPDATE_CATEGORY') {
      const cat = this.categories.find(c => c.id === body.id);
      if (cat) {
        if (body.name !== undefined && typeof body.name === 'string' && body.name.trim().length > 0) {
          cat.name = body.name.trim();
        }
        const rawType = body.categoryType || body.listType || (body.action ? body.type : undefined);
        if (rawType !== undefined) {
          cat.type = rawType === 'study' ? 'study' : 'todo';
        }
      }
    } else if (action === 'DELETE_CATEGORY') {
      if (body.id !== 'default') {
        this.categories = this.categories.filter(c => c.id !== body.id);
        this.todos = this.todos.map(t => t.categoryId === body.id ? { ...t, categoryId: 'default' } : t);
      }
    } else if (action === 'ADD_TODO') {
      this.todos.push({
        id: `todo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        text: body.text || 'Untitled',
        completed: false,
        categoryId: body.categoryId || 'default'
      });
    }

    return {
      todos: this.todos,
      categories: mapCategories(this.categories)
    };
  }

  getFallbackCategories(): Category[] {
    return [{ id: 'default', name: 'General', type: 'todo' as ListType }];
  }
}

describe('Challenger M1: Adversarial Type Fallback & Schema Robustness', () => {
  it('C1.1: Missing or corrupted type properties must safely fallback to "todo"', () => {
    const adversarialTypes: any[] = [
      undefined,
      null,
      '',
      '   ',
      'TODO',
      'Study',
      'STUDY',
      'notes',
      'workspace',
      123,
      false,
      true,
      {},
      [],
      NaN,
      Infinity,
      '__proto__'
    ];

    for (const badType of adversarialTypes) {
      const res = createCategoryLogic({ name: 'Test Cat', type: badType });
      assert.strictEqual(
        res.type, 
        'todo', 
        `Expected bad type ${JSON.stringify(badType)} to resolve to "todo", got ${res.type}`
      );
    }
  });

  it('C1.2: mapCategories must sanitize legacy records without type fields', () => {
    const legacyDBRows = [
      { id: '1', name: 'Work' },
      { id: '2', name: 'Personal', type: undefined },
      { id: '3', name: 'Random', type: null },
      { id: '4', name: 'Study Prep', type: 'study' },
      { id: '5', name: 'Corrupted', type: 'INVALID_ENUM' }
    ];

    const mapped = mapCategories(legacyDBRows);
    assert.strictEqual(mapped[0].type, 'todo');
    assert.strictEqual(mapped[1].type, 'todo');
    assert.strictEqual(mapped[2].type, 'todo');
    assert.strictEqual(mapped[3].type, 'study');
    assert.strictEqual(mapped[4].type, 'todo');
  });

  it('C1.3: Category name boundary handling with extreme Unicode & RTL', () => {
    const extremeNames = [
      '⚡ Rocket Launch Tasks 🚀',
      'قائمة دراسة نماذج الذكاء الاصطناعي والتفكير المنطقي 🧠📚',
      '日本語の勉強リスト 🎌',
      'A'.repeat(500), // very long name
      'List with <div>HTML</div> & "quotes" and \'apostrophes\''
    ];

    for (const name of extremeNames) {
      const cat = createCategoryLogic({ name, type: 'study' });
      assert.strictEqual(cat.name, name);
      assert.strictEqual(cat.type, 'study');
    }
  });
});

describe('Challenger M1: Rapid Type Switching & State Invariants', () => {
  it('C2.1: Rapid switching between todo and study must maintain deterministic UI contracts', () => {
    const db = new MockDatabaseState();
    db.handleRequest({ action: 'ADD_CATEGORY', name: 'Fuzzing Category', type: 'todo' });
    const catId = db.categories[1].id;

    for (let i = 0; i < 200; i++) {
      const targetType: ListType = i % 2 === 0 ? 'study' : 'todo';
      db.handleRequest({
        action: 'UPDATE_CATEGORY',
        id: catId,
        categoryType: targetType
      });

      const updatedCat = db.categories.find(c => c.id === catId)!;
      assert.strictEqual(updatedCat.type, targetType);

      const ui = getUIRenderContract({
        id: updatedCat.id,
        name: updatedCat.name,
        type: updatedCat.type!,
        createdAt: new Date().toISOString()
      });

      if (targetType === 'study') {
        assert.strictEqual(ui.hasQuizLauncher, true);
        assert.strictEqual(ui.hasObsidianNoteSelector, true);
        assert.strictEqual(ui.hasNoteViewer, true);
        assert.strictEqual(ui.hasTaskInputForm, false);
        assert.strictEqual(ui.hasTodoCheckboxList, false);
      } else {
        assert.strictEqual(ui.hasQuizLauncher, false);
        assert.strictEqual(ui.hasObsidianNoteSelector, false);
        assert.strictEqual(ui.hasNoteViewer, false);
        assert.strictEqual(ui.hasTaskInputForm, true);
        assert.strictEqual(ui.hasTodoCheckboxList, true);
      }
    }
  });
});

describe('Challenger M1: High Concurrency & ID Collision Stress', () => {
  it('C3.1: Mass concurrent category generation must produce 10,000 unique IDs without collision', () => {
    const count = 10000;
    const generatedCategories = new Array(count);
    const idSet = new Set<string>();

    const startTime = performance.now();
    for (let i = 0; i < count; i++) {
      const type: ListType = i % 3 === 0 ? 'study' : 'todo';
      const cat = createCategoryLogic({
        name: `Concurrent List ${i}`,
        type
      });
      generatedCategories[i] = cat;
      idSet.add(cat.id);
    }
    const duration = performance.now() - startTime;

    assert.strictEqual(idSet.size, count, `Collision detected! Expected ${count} unique IDs, got ${idSet.size}`);
    assert.strictEqual(generatedCategories.length, count);
    assert.ok(duration < 500, `Mass creation took ${duration.toFixed(2)}ms, expected < 500ms`);
  });
});

describe('Challenger M1: Mutation via UPDATE_CATEGORY & Action Aliasing', () => {
  it('C4.1: UPDATE_CATEGORY must handle payload aliases (categoryType vs listType vs type)', () => {
    const db = new MockDatabaseState();
    db.handleRequest({ action: 'ADD_CATEGORY', name: 'Test Subject' });
    const targetId = db.categories[1].id;

    // Test updating via categoryType alias
    db.handleRequest({ action: 'UPDATE_CATEGORY', id: targetId, categoryType: 'study' });
    assert.strictEqual(db.categories.find(c => c.id === targetId)?.type, 'study');

    // Test updating via listType alias
    db.handleRequest({ action: 'UPDATE_CATEGORY', id: targetId, listType: 'todo' });
    assert.strictEqual(db.categories.find(c => c.id === targetId)?.type, 'todo');

    // Test updating via action + type
    db.handleRequest({ action: 'UPDATE_CATEGORY', id: targetId, type: 'study' });
    assert.strictEqual(db.categories.find(c => c.id === targetId)?.type, 'study');

    // Test updating only name leaves type intact
    db.handleRequest({ action: 'UPDATE_CATEGORY', id: targetId, name: 'Renamed Subject' });
    assert.strictEqual(db.categories.find(c => c.id === targetId)?.name, 'Renamed Subject');
    assert.strictEqual(db.categories.find(c => c.id === targetId)?.type, 'study');

    // Test updating when payload uses { type: 'UPDATE_CATEGORY' } (action encoded as type)
    db.handleRequest({ type: 'UPDATE_CATEGORY', id: targetId, categoryType: 'todo' });
    assert.strictEqual(db.categories.find(c => c.id === targetId)?.type, 'todo');
  });

  it('C4.2: Category deletion preserves orphan todos by reassigning to default list', () => {
    const db = new MockDatabaseState();
    db.handleRequest({ action: 'ADD_CATEGORY', name: 'Temporary Study Group', categoryType: 'study' });
    const tempId = db.categories[1].id;

    db.handleRequest({ action: 'ADD_TODO', text: 'Important Note Review', categoryId: tempId });
    assert.strictEqual(db.todos.find(t => t.categoryId === tempId)?.text, 'Important Note Review');

    // Delete category
    db.handleRequest({ action: 'DELETE_CATEGORY', id: tempId });
    assert.strictEqual(db.categories.some(c => c.id === tempId), false);
    assert.strictEqual(db.todos[0].categoryId, 'default', 'Orphan todo must be reassigned to default');
  });
});

describe('Challenger M1: Deep UI Segregation & Mutual Exclusivity Property Invariants', () => {
  it('C5.1: Mathematical exclusivity: No UI state can ever satisfy both Study and ToDo contracts simultaneously', () => {
    const testCases: Array<{ type?: any }> = [
      { type: 'study' },
      { type: 'todo' },
      { type: undefined },
      { type: null },
      { type: 'invalid' }
    ];

    for (const tc of testCases) {
      const cat = createCategoryLogic({ name: 'Invariant Test', type: tc.type });
      const ui = getUIRenderContract(cat);

      // Invariant 1: Study tools and ToDo tools must be strictly mutually exclusive
      const studyActive = ui.hasQuizLauncher && ui.hasObsidianNoteSelector && ui.hasNoteViewer;
      const todoActive = ui.hasTaskInputForm && ui.hasTodoCheckboxList && ui.hasHabitStreakTracker;

      assert.notStrictEqual(studyActive, todoActive, 'Study and ToDo UI components cannot both be active or both be inactive');
      assert.strictEqual(studyActive !== todoActive, true, 'Strict XOR condition must hold for UI segregation');
    }
  });

  it('C5.2: State Machine Fuzzer — 5,000 randomized operations maintaining system integrity', () => {
    const db = new MockDatabaseState();
    const actions = ['ADD_CATEGORY', 'UPDATE_CATEGORY', 'DELETE_CATEGORY', 'ADD_TODO'];
    const types = ['todo', 'study', undefined, null, 'invalid_type', 'STUDY'];

    for (let step = 0; step < 5000; step++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      const chosenType = types[Math.floor(Math.random() * types.length)];
      const catCount = db.categories.length;

      if (action === 'ADD_CATEGORY') {
        db.handleRequest({
          action: 'ADD_CATEGORY',
          name: `Fuzz List ${step}`,
          categoryType: chosenType
        });
      } else if (action === 'UPDATE_CATEGORY') {
        const randomCat = db.categories[Math.floor(Math.random() * catCount)];
        db.handleRequest({
          action: 'UPDATE_CATEGORY',
          id: randomCat.id,
          name: `Updated ${step}`,
          categoryType: chosenType
        });
      } else if (action === 'DELETE_CATEGORY') {
        const randomCat = db.categories[Math.floor(Math.random() * catCount)];
        db.handleRequest({
          action: 'DELETE_CATEGORY',
          id: randomCat.id
        });
      } else if (action === 'ADD_TODO') {
        const randomCat = db.categories[Math.floor(Math.random() * catCount)];
        db.handleRequest({
          action: 'ADD_TODO',
          text: `Fuzz Todo ${step}`,
          categoryId: randomCat.id
        });
      }

      // Assert Invariants at each step:
      // 1. Default category must ALWAYS exist (cannot be deleted)
      const defaultCat = db.categories.find(c => c.id === 'default');
      assert.ok(defaultCat, 'Default category must never be deleted');

      // 2. All categories must have strictly 'todo' | 'study'
      for (const cat of db.categories) {
        assert.ok(cat.type === 'todo' || cat.type === 'study', `Invalid category type found: ${cat.type}`);
        const ui = getUIRenderContract(cat as any);
        assert.ok(typeof ui.hasQuizLauncher === 'boolean');
        assert.ok(typeof ui.hasTodoCheckboxList === 'boolean');
        assert.notStrictEqual(ui.hasQuizLauncher, ui.hasTodoCheckboxList);
      }

      // 3. All todos must reference an existing category
      const catIdSet = new Set(db.categories.map(c => c.id));
      for (const todo of db.todos) {
        assert.ok(catIdSet.has(todo.categoryId), `Orphan todo found pointing to non-existent category ${todo.categoryId}`);
      }
    }
  });

  it('C5.3: Cold start / uninitialized database fallback invariant', () => {
    const db = new MockDatabaseState();
    const fallback = db.getFallbackCategories();
    assert.strictEqual(fallback.length, 1);
    assert.strictEqual(fallback[0].id, 'default');
    assert.strictEqual(fallback[0].name, 'General');
    assert.strictEqual(fallback[0].type, 'todo');
  });
});
