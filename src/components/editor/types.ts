/**
 * Notion-Style Block Editor Types & Data Model
 */

export type BlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bullet_list'
  | 'numbered_list'
  | 'todo'
  | 'code_block'
  | 'quote'
  | 'callout'
  | 'divider';

export type CalloutType = 'note' | 'tip' | 'warning' | 'caution' | 'success';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean; // For 'todo'
  language?: string; // For 'code_block'
  calloutType?: CalloutType; // For 'callout'
  indent?: number; // 0, 1, 2, 3 for nested lists/todos
}

export interface BlockEditorDocument {
  frontmatter: Record<string, any>;
  blocks: Block[];
}

export interface SlashCommandItem {
  id: string;
  title: string;
  description: string;
  icon: string; // Lucide icon identifier
  keywords: string[];
  blockType: BlockType;
  defaultData?: Partial<Block>;
  category: 'Basic' | 'Lists' | 'Advanced';
}

export interface SlashMenuState {
  isOpen: boolean;
  blockId: string | null;
  query: string;
  selectedIndex: number;
  triggerPosition: number;
  menuCoords: { top: number; left: number };
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    id: 'text',
    title: 'Text',
    description: 'Just start writing with plain text.',
    icon: 'FileText',
    keywords: ['p', 'paragraph', 'normal', 'text', 'plain'],
    blockType: 'paragraph',
    category: 'Basic'
  },
  {
    id: 'heading1',
    title: 'Heading 1',
    description: 'Large section heading.',
    icon: 'Heading1',
    keywords: ['h1', 'heading', 'title', 'large', 'header'],
    blockType: 'heading1',
    category: 'Basic'
  },
  {
    id: 'heading2',
    title: 'Heading 2',
    description: 'Medium section heading.',
    icon: 'Heading2',
    keywords: ['h2', 'heading', 'subtitle', 'medium'],
    blockType: 'heading2',
    category: 'Basic'
  },
  {
    id: 'heading3',
    title: 'Heading 3',
    description: 'Small section heading.',
    icon: 'Heading3',
    keywords: ['h3', 'heading', 'sub', 'small'],
    blockType: 'heading3',
    category: 'Basic'
  },
  {
    id: 'todo',
    title: 'To-do List',
    description: 'Track tasks with a to-do checkbox.',
    icon: 'CheckSquare',
    keywords: ['todo', 'task', 'check', 'checkbox', 'list', '[]'],
    blockType: 'todo',
    defaultData: { checked: false },
    category: 'Lists'
  },
  {
    id: 'bullet_list',
    title: 'Bulleted List',
    description: 'Create a simple bulleted list.',
    icon: 'List',
    keywords: ['bullet', 'list', 'unordered', 'ul', '-'],
    blockType: 'bullet_list',
    category: 'Lists'
  },
  {
    id: 'numbered_list',
    title: 'Numbered List',
    description: 'Create a list with numbering.',
    icon: 'ListOrdered',
    keywords: ['number', 'ordered', 'list', 'ol', '1.'],
    blockType: 'numbered_list',
    category: 'Lists'
  },
  {
    id: 'quote',
    title: 'Quote',
    description: 'Capture a quote or citation.',
    icon: 'Quote',
    keywords: ['quote', 'cite', 'blockquote', '>'],
    blockType: 'quote',
    category: 'Basic'
  },
  {
    id: 'callout',
    title: 'Callout Box',
    description: 'Make writing stand out with an alert container.',
    icon: 'AlertCircle',
    keywords: ['callout', 'alert', 'box', 'note', 'tip', 'warning', 'highlight', 'info'],
    blockType: 'callout',
    defaultData: { calloutType: 'note' },
    category: 'Advanced'
  },
  {
    id: 'code_block',
    title: 'Code Block',
    description: 'Capture code snippet with syntax styling.',
    icon: 'Code',
    keywords: ['code', 'snippet', 'pre', 'javascript', 'typescript', 'python', 'sql', 'js', 'ts'],
    blockType: 'code_block',
    defaultData: { language: 'typescript' },
    category: 'Advanced'
  },
  {
    id: 'divider',
    title: 'Divider',
    description: 'Visually divide blocks with a horizontal line.',
    icon: 'Minus',
    keywords: ['divider', 'line', 'separator', 'hr', '---'],
    blockType: 'divider',
    category: 'Basic'
  }
];

export function filterSlashCommands(query: string): SlashCommandItem[] {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return SLASH_COMMANDS;

  return SLASH_COMMANDS.filter(cmd => {
    if (cmd.title.toLowerCase().includes(cleanQuery)) return true;
    if (cmd.description.toLowerCase().includes(cleanQuery)) return true;
    if (cmd.keywords.some(kw => kw.toLowerCase().includes(cleanQuery))) return true;
    return false;
  });
}

