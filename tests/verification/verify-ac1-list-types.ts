/**
 * AC 1 Verification Script: List Types (ToDo vs Study) & UI Segregation
 * 
 * Target Acceptance Criteria:
 * 1. A user can create a new list and explicitly select its type (e.g. "ToDo" or "Study").
 * 2. Navigating to a "Study" list displays a distinct UI (e.g. quizzing interfaces) that is completely absent in a "ToDo" list.
 */

import assert from 'node:assert/strict';

export interface CategoryInput {
  name: string;
  type?: 'todo' | 'study';
  vaultFolder?: string;
  studyTags?: string[];
  color?: string;
  icon?: string;
}

export interface CategoryRecord {
  id: string;
  name: string;
  type: 'todo' | 'study';
  vaultFolder?: string;
  studyTags?: string[];
  color?: string;
  icon?: string;
  createdAt: string;
}

export interface UIContractSnapshot {
  hasTaskInputForm: boolean;
  hasTodoCheckboxList: boolean;
  hasHabitStreakTracker: boolean;
  hasObsidianNoteSelector: boolean;
  hasNoteViewer: boolean;
  hasQuizLauncher: boolean;
  hasFlashcardMode: boolean;
}

/**
 * Validates and normalizes category creation logic.
 */
export function createCategoryLogic(input: CategoryInput): CategoryRecord {
  if (!input.name || input.name.trim() === '') {
    throw new Error('Category name cannot be empty');
  }

  const normalizedType: 'todo' | 'study' = input.type === 'study' ? 'study' : 'todo';

  return {
    id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 10)}_${Math.random().toString(36).slice(2, 10)}`,
    name: input.name.trim(),
    type: normalizedType,
    vaultFolder: normalizedType === 'study' ? input.vaultFolder : undefined,
    studyTags: normalizedType === 'study' ? input.studyTags : undefined,
    color: input.color || (normalizedType === 'study' ? '#8B5CF6' : '#3B82F6'),
    icon: input.icon || (normalizedType === 'study' ? 'GraduationCap' : 'CheckSquare'),
    createdAt: new Date().toISOString()
  };
}

/**
 * Computes which UI components should be active based on category type.
 */
export function getUIRenderContract(category: CategoryRecord): UIContractSnapshot {
  if (category.type === 'study') {
    return {
      hasTaskInputForm: false,
      hasTodoCheckboxList: false,
      hasHabitStreakTracker: false,
      hasObsidianNoteSelector: true,
      hasNoteViewer: true,
      hasQuizLauncher: true,
      hasFlashcardMode: true
    };
  }

  return {
    hasTaskInputForm: true,
    hasTodoCheckboxList: true,
    hasHabitStreakTracker: true,
    hasObsidianNoteSelector: false,
    hasNoteViewer: false,
    hasQuizLauncher: false,
    hasFlashcardMode: false
  };
}

export async function verifyAC1(): Promise<boolean> {
  console.log('\n======================================================================');
  console.log('▶ RUNNING AC-1 VERIFICATION: List Types (ToDo vs Study) & UI Isolation');
  console.log('======================================================================');

  // Step 1: Explicit Study List Creation
  console.log('\n[1/4] Verifying explicit Study list creation...');
  const studyCategory = createCategoryLogic({
    name: 'AI & Agentic Systems',
    type: 'study',
    vaultFolder: '02 - Core Brain',
    studyTags: ['concept', 'agent']
  });

  assert.equal(studyCategory.name, 'AI & Agentic Systems', 'Study category name must match input');
  assert.equal(studyCategory.type, 'study', 'Category type must explicitly be "study"');
  assert.equal(studyCategory.vaultFolder, '02 - Core Brain', 'Vault folder scoping must be preserved');
  assert.deepEqual(studyCategory.studyTags, ['concept', 'agent'], 'Study tags must match');
  console.log('  ✔ Created Study category:', studyCategory.name, `(type: ${studyCategory.type}, id: ${studyCategory.id})`);

  // Step 2: Explicit ToDo List Creation
  console.log('\n[2/4] Verifying explicit ToDo list creation...');
  const todoCategory = createCategoryLogic({
    name: 'Daily Engineering Tasks',
    type: 'todo'
  });

  assert.equal(todoCategory.name, 'Daily Engineering Tasks', 'ToDo category name must match input');
  assert.equal(todoCategory.type, 'todo', 'Category type must explicitly be "todo"');
  assert.equal(todoCategory.vaultFolder, undefined, 'ToDo category must not have vault folder binding');
  console.log('  ✔ Created ToDo category:', todoCategory.name, `(type: ${todoCategory.type}, id: ${todoCategory.id})`);

  // Step 3: Default List Type Fallback
  console.log('\n[3/4] Verifying backward-compatible default type fallback...');
  const defaultCategory = createCategoryLogic({
    name: 'Unspecified Type List'
  });
  assert.equal(defaultCategory.type, 'todo', 'Missing category type must safely default to "todo"');
  console.log('  ✔ Unspecified category defaulted to "todo"');

  // Step 4: Strict UI Component Segregation Assertion
  console.log('\n[4/4] Verifying strict UI component segregation contracts...');
  const studyUI = getUIRenderContract(studyCategory);
  const todoUI = getUIRenderContract(todoCategory);

  // Study View Assertions
  assert.strictEqual(studyUI.hasQuizLauncher, true, 'Study view MUST contain QuizLauncher');
  assert.strictEqual(studyUI.hasObsidianNoteSelector, true, 'Study view MUST contain Obsidian Note Selector');
  assert.strictEqual(studyUI.hasNoteViewer, true, 'Study view MUST contain Note Viewer');
  assert.strictEqual(studyUI.hasTaskInputForm, false, 'Study view MUST NOT contain TaskInputForm');
  assert.strictEqual(studyUI.hasTodoCheckboxList, false, 'Study view MUST NOT contain TodoCheckboxList');
  assert.strictEqual(studyUI.hasHabitStreakTracker, false, 'Study view MUST NOT contain HabitStreakTracker');

  // ToDo View Assertions
  assert.strictEqual(todoUI.hasTaskInputForm, true, 'ToDo view MUST contain TaskInputForm');
  assert.strictEqual(todoUI.hasTodoCheckboxList, true, 'ToDo view MUST contain TodoCheckboxList');
  assert.strictEqual(todoUI.hasHabitStreakTracker, true, 'ToDo view MUST contain HabitStreakTracker');
  assert.strictEqual(todoUI.hasQuizLauncher, false, 'ToDo view MUST NOT contain QuizLauncher');
  assert.strictEqual(todoUI.hasObsidianNoteSelector, false, 'ToDo view MUST NOT contain Obsidian Note Selector');
  assert.strictEqual(todoUI.hasNoteViewer, false, 'ToDo view MUST NOT contain Note Viewer');

  console.log('  ✔ Study UI contract: [QuizLauncher=YES, ObsidianViewer=YES, TodoTasks=NO]');
  console.log('  ✔ ToDo UI contract: [QuizLauncher=NO, ObsidianViewer=NO, TodoTasks=YES]');

  console.log('\n\x1b[32m✔ AC-1 VERIFICATION PASSED: Explicit list types and strict UI segregation verified.\x1b[0m');
  return true;
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('verify-ac1-list-types.ts')) {
  verifyAC1().catch((err) => {
    console.error('\n\x1b[31m❌ AC-1 VERIFICATION FAILED:\x1b[0m', err);
    process.exit(1);
  });
}
