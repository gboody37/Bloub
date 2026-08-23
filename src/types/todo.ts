export type ListType = 'todo' | 'study';

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Attachment {
  type: 'image' | 'video' | 'audio';
  url: string;
  name: string;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  categoryId: string;
  user_id?: string;
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;
  subtasks?: Subtask[];
  isHabit?: boolean;
  habitFrequency?: number;
  habitDays?: string[];
  habitCompletedCount?: number;
  habitStreak?: number;
  habitLastCompleted?: string;
  attachments?: Attachment[];
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  type?: ListType; // 'todo' | 'study' (defaults to 'todo')
  user_id?: string;
  icon?: string;
  color?: string;
  vaultFolder?: string;
  studyTags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface DataResponse {
  todos: Todo[];
  categories: Category[];
}

export type CategoryActionType =
  | 'ADD_CATEGORY'
  | 'UPDATE_CATEGORY'
  | 'DELETE_CATEGORY'
  | 'ADD_TODO'
  | 'TOGGLE_TODO'
  | 'INCREMENT_HABIT'
  | 'DELETE_TODO'
  | 'CLEAR_COMPLETED'
  | 'SET_PRIORITY'
  | 'SET_DUE_DATE';
