export interface StudyQuest {
  id: string;
  title: string;
  completed: boolean;
  order_index?: number;
  created_at?: string;
}

export interface StudyNote {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  pdf_url?: string;
  annotations?: any[];
  updated_at?: string;
}

export interface StudyFlashcard {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  hint?: string;
}

export interface UserSettings {
  mascot_shape: string;
  mascot_color: string;
  theme: string;
  gemini_api_key?: string;
}
