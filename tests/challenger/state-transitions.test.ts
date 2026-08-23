/**
 * Challenger Test Suite: State Transitions & Navigation Stability
 * 
 * Objectives:
 * 1. Verify rapid back-and-forth transitions between Study and ToDo lists do not leak state.
 * 2. Verify in-place category type mutations (ToDo -> Study and Study -> ToDo) seamlessly re-route views.
 * 3. Verify category deletion while currently viewed resets safely to default ToDo list without unhandled errors.
 * 4. Execute a 1,000-cycle state transition stress harness to guarantee stability under fast user interaction.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Category, Todo, ListType } from '../../src/types/todo.ts';

interface AppState {
  activeTab: 'lists' | 'today' | 'stats';
  isListView: boolean;
  activeCategory: string;
  categories: Category[];
  todos: Todo[];
  expandedTask: string | null;
  listMenuId: string | null;
  editingListId: string | null;
  newCatType: ListType;
}

class AppStateController {
  public state: AppState;
  public transitionLog: string[] = [];

  constructor(initialCategories: Category[], initialTodos: Todo[]) {
    this.state = {
      activeTab: 'lists',
      isListView: true,
      activeCategory: 'default',
      categories: initialCategories.map(c => ({
        ...c,
        type: (c.type === 'study' ? 'study' : 'todo') as ListType
      })),
      todos: [...initialTodos],
      expandedTask: null,
      listMenuId: null,
      editingListId: null,
      newCatType: 'todo'
    };
  }

  public getActiveCategory(): Category {
    return (
      this.state.categories.find(c => c.id === this.state.activeCategory) || {
        id: 'default',
        name: 'General',
        type: 'todo'
      }
    );
  }

  public openCategory(categoryId: string) {
    const cat = this.state.categories.find(c => c.id === categoryId);
    if (!cat) throw new Error(`Category not found: ${categoryId}`);
    this.state.activeCategory = categoryId;
    this.state.isListView = false;
    this.state.activeTab = 'lists';
    this.transitionLog.push(`OPEN_CATEGORY:${categoryId}:${cat.type}`);
  }

  public backToLists() {
    this.state.isListView = true;
    this.transitionLog.push('BACK_TO_LISTS');
  }

  public switchTab(tab: 'lists' | 'today' | 'stats') {
    this.state.activeTab = tab;
    this.transitionLog.push(`SWITCH_TAB:${tab}`);
  }

  public toggleCategoryType(categoryId: string) {
    const catIndex = this.state.categories.findIndex(c => c.id === categoryId);
    if (catIndex === -1) throw new Error(`Category not found: ${categoryId}`);

    const currentType = this.state.categories[catIndex].type || 'todo';
    const nextType: ListType = currentType === 'study' ? 'todo' : 'study';

    this.state.categories[catIndex] = {
      ...this.state.categories[catIndex],
      type: nextType
    };
    this.transitionLog.push(`TOGGLE_TYPE:${categoryId}:${currentType}->${nextType}`);
  }

  public deleteCategory(categoryId: string) {
    if (categoryId === 'default') return; // default cannot be deleted
    this.state.categories = this.state.categories.filter(c => c.id !== categoryId);
    if (this.state.activeCategory === categoryId) {
      this.state.activeCategory = 'default';
    }
    // Re-assign todos from deleted category to default
    this.state.todos = this.state.todos.map(t =>
      t.categoryId === categoryId ? { ...t, categoryId: 'default' } : t
    );
    this.transitionLog.push(`DELETE_CATEGORY:${categoryId}`);
  }

  public getCurrentRenderedView(): 'lists-overview' | 'todo-workspace' | 'study-workspace' | 'today-view' | 'stats-view' {
    if (this.state.activeTab === 'today') return 'today-view';
    if (this.state.activeTab === 'stats') return 'stats-view';
    if (this.state.isListView) return 'lists-overview';

    const activeCat = this.getActiveCategory();
    return activeCat.type === 'study' ? 'study-workspace' : 'todo-workspace';
  }
}

describe('Challenger Suite 2: State Transitions & Navigation Stability', () => {
  const initialCategories: Category[] = [
    { id: 'default', name: 'General', type: 'todo' },
    { id: 'cat_work', name: 'Engineering', type: 'todo' },
    { id: 'cat_study', name: 'Neuroscience & AI', type: 'study' }
  ];

  const initialTodos: Todo[] = [
    { id: 't1', text: 'Refactor DB queries', completed: false, categoryId: 'cat_work' },
    { id: 't2', text: 'Review PRs', completed: true, categoryId: 'cat_work' },
    { id: 't3', text: 'Study Transformers', completed: false, categoryId: 'cat_study' }
  ];

  it('CHAL-2.1: Clean transitions back-and-forth between Study and ToDo workspaces', () => {
    const controller = new AppStateController(initialCategories, initialTodos);

    // 1. Initial State: Lists Overview
    assert.strictEqual(controller.getCurrentRenderedView(), 'lists-overview');

    // 2. Open Study List
    controller.openCategory('cat_study');
    assert.strictEqual(controller.getCurrentRenderedView(), 'study-workspace');
    assert.strictEqual(controller.getActiveCategory().type, 'study');

    // 3. Return to Overview
    controller.backToLists();
    assert.strictEqual(controller.getCurrentRenderedView(), 'lists-overview');

    // 4. Open ToDo List
    controller.openCategory('cat_work');
    assert.strictEqual(controller.getCurrentRenderedView(), 'todo-workspace');
    assert.strictEqual(controller.getActiveCategory().type, 'todo');

    // 5. Directly open Study list from another list (simulating deep link or quick jump)
    controller.openCategory('cat_study');
    assert.strictEqual(controller.getCurrentRenderedView(), 'study-workspace');

    // 6. Direct jump back to ToDo list
    controller.openCategory('cat_work');
    assert.strictEqual(controller.getCurrentRenderedView(), 'todo-workspace');
  });

  it('CHAL-2.2: In-place category type toggle updates workspace view dynamically without data corruption', () => {
    const controller = new AppStateController(initialCategories, initialTodos);

    // Open ToDo Category
    controller.openCategory('cat_work');
    assert.strictEqual(controller.getCurrentRenderedView(), 'todo-workspace');

    // Toggle 'cat_work' from 'todo' to 'study' while it is the active category
    controller.toggleCategoryType('cat_work');
    assert.strictEqual(controller.getCurrentRenderedView(), 'study-workspace', 'Workspace must immediately reflect Study UI after type mutation');

    // Verify category model in state
    const currentCat = controller.getActiveCategory();
    assert.strictEqual(currentCat.type, 'study');

    // Toggle back from 'study' to 'todo'
    controller.toggleCategoryType('cat_work');
    assert.strictEqual(controller.getCurrentRenderedView(), 'todo-workspace', 'Workspace must immediately reflect ToDo UI after reverting');
    assert.strictEqual(controller.getActiveCategory().type, 'todo');

    // Verify existing todos in this category were preserved
    const catTodos = controller.state.todos.filter(t => t.categoryId === 'cat_work');
    assert.strictEqual(catTodos.length, 2, 'Todos must remain intact after category type toggling');
    assert.strictEqual(catTodos[0].text, 'Refactor DB queries');
    assert.strictEqual(catTodos[1].completed, true);
  });

  it('CHAL-2.3: Category deletion while actively viewed falls back safely to default ToDo list', () => {
    const controller = new AppStateController(initialCategories, initialTodos);

    // Open Study category
    controller.openCategory('cat_study');
    assert.strictEqual(controller.getCurrentRenderedView(), 'study-workspace');

    // Delete the active Study category
    controller.deleteCategory('cat_study');

    // Active category should fallback to 'default'
    assert.strictEqual(controller.state.activeCategory, 'default');
    assert.strictEqual(controller.getCurrentRenderedView(), 'todo-workspace', 'Should safely fallback to General ToDo workspace');
    assert.strictEqual(controller.getActiveCategory().name, 'General');
  });

  it('CHAL-2.4: Stress Test: 1,000 rapid state transitions without unhandled exceptions or state leaks', () => {
    const controller = new AppStateController(initialCategories, initialTodos);
    const categoryIds = ['default', 'cat_work', 'cat_study'];
    const tabs: Array<'lists' | 'today' | 'stats'> = ['lists', 'today', 'stats'];

    const startTime = performance.now();

    for (let i = 0; i < 1000; i++) {
      const op = i % 5;
      if (op === 0) {
        const catId = categoryIds[i % categoryIds.length];
        controller.openCategory(catId);
      } else if (op === 1) {
        controller.backToLists();
      } else if (op === 2) {
        controller.switchTab(tabs[i % tabs.length]);
      } else if (op === 3) {
        controller.toggleCategoryType('cat_work');
      } else if (op === 4) {
        const view = controller.getCurrentRenderedView();
        assert.ok(
          ['lists-overview', 'todo-workspace', 'study-workspace', 'today-view', 'stats-view'].includes(view),
          `Invalid view rendered: ${view}`
        );
      }
    }

    const elapsed = performance.now() - startTime;
    assert.strictEqual(controller.transitionLog.length >= 800, true);
    assert.ok(elapsed < 200, `1000 transitions took ${elapsed}ms (must be < 200ms)`);
  });
});
