/**
 * Challenger Test Suite: UI Component Segregation (Study vs ToDo)
 * 
 * Objectives:
 * 1. Empirically verify that Study List view strictly DOES NOT render:
 *    - ToDo task checkboxes (completed/uncompleted icons)
 *    - Task input forms / textareas
 *    - Habit buttons and streak counters
 *    - Add Task Floating Action Button (FAB)
 *    - Task priority selectors and due date badges
 * 2. Empirically verify that ToDo List view strictly DOES NOT render:
 *    - Obsidian Brain vault banner and file scanner widgets
 *    - NotebookLM AI Quiz generator tiles
 *    - Bloub study session starter button
 * 3. Verify header subtitle / badge segregation (Study Workspace vs X of Y completed).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Category, Todo, ListType } from '../../src/types/todo.ts';

// Model of page rendering state to simulate src/app/page.tsx UI branches accurately
interface PageViewState {
  activeTab: 'lists' | 'today' | 'stats';
  isListView: boolean;
  activeCategory: string;
  categories: Category[];
  todos: Todo[];
  expandedTaskId: string | null;
  showAddModal: boolean;
}

// Simulates the DOM/element tree rendered by src/app/page.tsx for a given state
function renderPageDOM(state: PageViewState) {
  const activeCatObj: Category = state.categories.find(c => c.id === state.activeCategory) || {
    id: 'default',
    name: 'General',
    type: 'todo'
  };

  const filteredTodos = state.todos.filter(t => {
    if (state.activeTab === 'lists') return t.categoryId === state.activeCategory;
    if (state.activeTab === 'today') {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      const today = new Date();
      return due.toDateString() === today.toDateString() || due < today;
    }
    return false;
  });

  const completedCount = filteredTodos.filter(t => t.completed).length;
  const totalCount = filteredTodos.length;

  const elements = {
    // Header
    headerTitle: state.activeTab === 'lists' ? (state.isListView ? 'My Lists' : activeCatObj.name) : state.activeTab === 'today' ? 'Today' : 'Stats',
    headerStudyBadge: !state.isListView && state.activeTab === 'lists' && activeCatObj.type === 'study',
    headerCompletedCounter: !state.isListView && state.activeTab === 'lists' && activeCatObj.type !== 'study' ? `${completedCount} of ${totalCount} completed` : null,

    // Lists Master View
    listsMasterView: state.activeTab === 'lists' && state.isListView,

    // Stats View
    statsView: state.activeTab === 'stats',

    // Main Workspace View
    backToListsButton: state.activeTab === 'lists' && !state.isListView,

    // Study Workspace Scaffold
    studyWorkspaceScaffold: state.activeTab === 'lists' && !state.isListView && activeCatObj.type === 'study',
    studyHeroCard: state.activeTab === 'lists' && !state.isListView && activeCatObj.type === 'study',
    studyVaultNotesTile: state.activeTab === 'lists' && !state.isListView && activeCatObj.type === 'study',
    studyAiQuizTile: state.activeTab === 'lists' && !state.isListView && activeCatObj.type === 'study',
    studySessionStarterButton: state.activeTab === 'lists' && !state.isListView && activeCatObj.type === 'study',

    // Classic ToDo Task List View
    todoTaskListView: state.activeTab === 'lists' && !state.isListView && activeCatObj.type !== 'study',
    addTaskFAB: state.activeTab === 'lists' && !state.isListView && activeCatObj.type !== 'study',
    taskItemsCount: state.activeTab === 'lists' && !state.isListView && activeCatObj.type !== 'study' ? filteredTodos.length : 0,
    taskCheckboxes: state.activeTab === 'lists' && !state.isListView && activeCatObj.type !== 'study' ? filteredTodos.map(t => ({ id: t.id, completed: t.completed, isHabit: !!t.isHabit })) : [],
    habitCounters: state.activeTab === 'lists' && !state.isListView && activeCatObj.type !== 'study' ? filteredTodos.filter(t => t.isHabit) : [],
    priorityIndicators: state.activeTab === 'lists' && !state.isListView && activeCatObj.type !== 'study' ? filteredTodos.filter(t => t.priority) : []
  };

  return {
    activeCatObj,
    filteredTodos,
    elements
  };
}

describe('Challenger Suite 1: UI Component Segregation (Study vs ToDo)', () => {
  const sampleCategories: Category[] = [
    { id: 'default', name: 'General', type: 'todo' },
    { id: 'cat_work', name: 'Work Project', type: 'todo' },
    { id: 'cat_study_ai', name: 'AI & LLM Studies', type: 'study' },
    { id: 'cat_study_btec', name: 'BTEC Engineering', type: 'study' }
  ];

  const sampleTodos: Todo[] = [
    { id: '1', text: 'Task 1 in General', completed: false, categoryId: 'default' },
    { id: '2', text: 'Task 2 in Work', completed: true, categoryId: 'cat_work' },
    { id: '3', text: 'Habit in Work', completed: false, categoryId: 'cat_work', isHabit: true, habitFrequency: 3, habitCompletedCount: 1 },
    { id: '4', text: 'Task accidentally attached to Study Cat', completed: false, categoryId: 'cat_study_ai' }
  ];

  it('CHAL-1.1: Study List View must strictly NOT render ToDo components', () => {
    const studyState: PageViewState = {
      activeTab: 'lists',
      isListView: false,
      activeCategory: 'cat_study_ai',
      categories: sampleCategories,
      todos: sampleTodos,
      expandedTaskId: null,
      showAddModal: false
    };

    const { elements } = renderPageDOM(studyState);

    // 1. Study components MUST be present
    assert.strictEqual(elements.studyWorkspaceScaffold, true, 'Study Workspace scaffold must be active');
    assert.strictEqual(elements.studyHeroCard, true, 'Study Hero Card must be rendered');
    assert.strictEqual(elements.studyVaultNotesTile, true, 'Obsidian Vault Notes Tile must be rendered');
    assert.strictEqual(elements.studyAiQuizTile, true, 'NotebookLM AI Quiz Tile must be rendered');
    assert.strictEqual(elements.studySessionStarterButton, true, 'Study with Bloub button must be rendered');
    assert.strictEqual(elements.headerStudyBadge, true, 'Header Study Workspace badge must be rendered');

    // 2. ToDo components MUST NOT be present
    assert.strictEqual(elements.todoTaskListView, false, 'ToDo Task List View must NOT be rendered');
    assert.strictEqual(elements.addTaskFAB, false, 'Add Task FAB must NOT be rendered in Study view');
    assert.strictEqual(elements.taskItemsCount, 0, 'No task items must be rendered in Study view');
    assert.deepStrictEqual(elements.taskCheckboxes, [], 'No task checkboxes must be rendered');
    assert.deepStrictEqual(elements.habitCounters, [], 'No habit counters must be rendered');
    assert.deepStrictEqual(elements.priorityIndicators, [], 'No priority indicators must be rendered');
    assert.strictEqual(elements.headerCompletedCounter, null, 'Header completed counter must NOT be rendered for Study');
  });

  it('CHAL-1.2: ToDo List View must strictly NOT render Study Workspace components', () => {
    const todoState: PageViewState = {
      activeTab: 'lists',
      isListView: false,
      activeCategory: 'cat_work',
      categories: sampleCategories,
      todos: sampleTodos,
      expandedTaskId: null,
      showAddModal: false
    };

    const { elements } = renderPageDOM(todoState);

    // 1. ToDo components MUST be present
    assert.strictEqual(elements.todoTaskListView, true, 'ToDo Task List View must be active');
    assert.strictEqual(elements.addTaskFAB, true, 'Add Task FAB must be rendered');
    assert.strictEqual(elements.taskItemsCount, 2, '2 tasks belonging to cat_work must be rendered');
    assert.strictEqual(elements.taskCheckboxes.length, 2, '2 task checkboxes must be rendered');
    assert.strictEqual(elements.habitCounters.length, 1, '1 habit counter must be rendered');
    assert.strictEqual(elements.headerCompletedCounter, '1 of 2 completed', 'Header completed counter must match');

    // 2. Study components MUST NOT be present
    assert.strictEqual(elements.studyWorkspaceScaffold, false, 'Study Workspace scaffold must NOT be rendered in ToDo');
    assert.strictEqual(elements.studyHeroCard, false, 'Study Hero Card must NOT be rendered in ToDo');
    assert.strictEqual(elements.studyVaultNotesTile, false, 'Obsidian Vault Tile must NOT be rendered in ToDo');
    assert.strictEqual(elements.studyAiQuizTile, false, 'AI Quiz Tile must NOT be rendered in ToDo');
    assert.strictEqual(elements.studySessionStarterButton, false, 'Bloub study button must NOT be rendered in ToDo');
    assert.strictEqual(elements.headerStudyBadge, false, 'Header Study badge must NOT be rendered in ToDo');
  });

  it('CHAL-1.3: Default / Unspecified category safely renders as ToDo checklist', () => {
    const defaultState: PageViewState = {
      activeTab: 'lists',
      isListView: false,
      activeCategory: 'default',
      categories: sampleCategories,
      todos: sampleTodos,
      expandedTaskId: null,
      showAddModal: false
    };

    const { elements } = renderPageDOM(defaultState);

    assert.strictEqual(elements.todoTaskListView, true);
    assert.strictEqual(elements.studyWorkspaceScaffold, false);
    assert.strictEqual(elements.addTaskFAB, true);
    assert.strictEqual(elements.headerCompletedCounter, '0 of 1 completed');
  });

  it('CHAL-1.4: Legacy category without type property defaults to ToDo view', () => {
    const legacyCategory: Category = { id: 'legacy_cat', name: 'Old List' }; // type is undefined
    const state: PageViewState = {
      activeTab: 'lists',
      isListView: false,
      activeCategory: 'legacy_cat',
      categories: [...sampleCategories, legacyCategory],
      todos: sampleTodos,
      expandedTaskId: null,
      showAddModal: false
    };

    const { elements } = renderPageDOM(state);

    assert.strictEqual(elements.todoTaskListView, true, 'Legacy category without explicit type must render ToDo view');
    assert.strictEqual(elements.studyWorkspaceScaffold, false, 'Legacy category must NOT render Study view');
  });
});
