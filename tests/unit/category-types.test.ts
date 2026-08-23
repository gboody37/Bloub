/**
 * Tier 1 & Tier 2 Unit Tests: Category Model & List Types (ToDo vs Study)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCategoryLogic, getUIRenderContract } from '../verification/verify-ac1-list-types.ts';
import type { CategoryInput } from '../verification/verify-ac1-list-types.ts';

describe('Category Model & List Types (Tier 1: Feature Coverage)', () => {
  it('T1.1: should create a valid Study category with vault binding and study tags', () => {
    const input: CategoryInput = {
      name: 'Agentic Workflows & MCP',
      type: 'study',
      vaultFolder: '02 - Core Brain',
      studyTags: ['concept', 'agent', 'mcp'],
      color: '#8B5CF6'
    };

    const category = createCategoryLogic(input);
    assert.equal(category.name, 'Agentic Workflows & MCP');
    assert.equal(category.type, 'study');
    assert.equal(category.vaultFolder, '02 - Core Brain');
    assert.deepEqual(category.studyTags, ['concept', 'agent', 'mcp']);
    assert.equal(category.icon, 'GraduationCap');
    assert.ok(category.id.startsWith('cat_'));
  });

  it('T1.2: should create a valid ToDo category with standard checklist attributes', () => {
    const input: CategoryInput = {
      name: 'Daily Standup Tasks',
      type: 'todo',
      color: '#3B82F6'
    };

    const category = createCategoryLogic(input);
    assert.equal(category.name, 'Daily Standup Tasks');
    assert.equal(category.type, 'todo');
    assert.equal(category.vaultFolder, undefined);
    assert.equal(category.icon, 'CheckSquare');
  });

  it('T1.3: should default unspecified type to "todo" for backwards compatibility', () => {
    const category = createCategoryLogic({ name: 'Legacy Unmigrated List' });
    assert.equal(category.type, 'todo');
  });

  it('T1.4: should provide correct UI contract for Study category', () => {
    const studyCategory = createCategoryLogic({ name: 'Study List', type: 'study' });
    const ui = getUIRenderContract(studyCategory);

    assert.equal(ui.hasQuizLauncher, true);
    assert.equal(ui.hasObsidianNoteSelector, true);
    assert.equal(ui.hasNoteViewer, true);
    assert.equal(ui.hasFlashcardMode, true);
    assert.equal(ui.hasTaskInputForm, false);
    assert.equal(ui.hasTodoCheckboxList, false);
    assert.equal(ui.hasHabitStreakTracker, false);
  });

  it('T1.5: should provide correct UI contract for ToDo category', () => {
    const todoCategory = createCategoryLogic({ name: 'ToDo List', type: 'todo' });
    const ui = getUIRenderContract(todoCategory);

    assert.equal(ui.hasTaskInputForm, true);
    assert.equal(ui.hasTodoCheckboxList, true);
    assert.equal(ui.hasHabitStreakTracker, true);
    assert.equal(ui.hasQuizLauncher, false);
    assert.equal(ui.hasObsidianNoteSelector, false);
    assert.equal(ui.hasNoteViewer, false);
    assert.equal(ui.hasFlashcardMode, false);
  });
});

describe('Category Model Boundary & Edge Cases (Tier 2: Boundary Value Analysis)', () => {
  it('T2.1: should reject empty or whitespace-only category names', () => {
    assert.throws(() => createCategoryLogic({ name: '' }), /Category name cannot be empty/);
    assert.throws(() => createCategoryLogic({ name: '   ' }), /Category name cannot be empty/);
  });

  it('T2.2: should support Arabic & Unicode names without corruption', () => {
    const category = createCategoryLogic({
      name: 'جبنة - دراسة الذكاء الاصطناعي 🧀',
      type: 'study',
      vaultFolder: '02 - Core Brain'
    });
    assert.equal(category.name, 'جبنة - دراسة الذكاء الاصطناعي 🧀');
    assert.equal(category.type, 'study');
  });

  it('T2.3: should trim surrounding whitespace from category names', () => {
    const category = createCategoryLogic({ name: '  Cleaned Category Name  ' });
    assert.equal(category.name, 'Cleaned Category Name');
  });

  it('T2.4: should ignore vaultFolder attribute when category type is todo', () => {
    const category = createCategoryLogic({
      name: 'Errands',
      type: 'todo',
      vaultFolder: '02 - Core Brain' // Should be disregarded for ToDo
    });
    assert.equal(category.type, 'todo');
    assert.equal(category.vaultFolder, undefined);
  });

  it('T2.5: should generate unique IDs for concurrent category creations', () => {
    const cat1 = createCategoryLogic({ name: 'List 1' });
    const cat2 = createCategoryLogic({ name: 'List 2' });
    assert.notEqual(cat1.id, cat2.id);
  });
});
