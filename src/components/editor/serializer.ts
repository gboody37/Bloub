/**
 * Bidirectional Lossless Markdown AST Serializer for Notion-Style Block Editor
 */

import type { Block, BlockEditorDocument, BlockType, CalloutType } from './types';

/**
 * Generate unique block ID
 */
export function generateBlockId(): string {
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Parse YAML frontmatter text into a JavaScript dictionary
 */
export function parseYamlFrontmatter(yamlStr: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = yamlStr.split(/\r?\n/);

  let currentKey: string | null = null;
  let currentArray: string[] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check for array item continuation
    if (trimmed.startsWith('- ') && currentKey && currentArray) {
      const itemVal = trimmed.slice(2).trim().replace(/^['"]|['"]$/g, '');
      currentArray.push(itemVal);
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      // Save previous array if any
      if (currentKey && currentArray) {
        result[currentKey] = currentArray;
        currentKey = null;
        currentArray = null;
      }

      const key = line.slice(0, colonIdx).trim();
      const valStr = line.slice(colonIdx + 1).trim();

      if (!valStr) {
        // Might be beginning of multi-line array
        currentKey = key;
        currentArray = [];
        continue;
      }

      // Inline array e.g. [a, b, c]
      if (valStr.startsWith('[') && valStr.endsWith(']')) {
        const items = valStr
          .slice(1, -1)
          .split(',')
          .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
        result[key] = items;
      } else if (valStr === 'true') {
        result[key] = true;
      } else if (valStr === 'false') {
        result[key] = false;
      } else if (/^\d+$/.test(valStr)) {
        result[key] = parseInt(valStr, 10);
      } else {
        result[key] = valStr.replace(/^['"]|['"]$/g, '');
      }
    }
  }

  if (currentKey && currentArray) {
    result[currentKey] = currentArray;
  }

  return result;
}

/**
 * Convert frontmatter object to YAML string
 */
export function serializeYamlFrontmatter(frontmatter: Record<string, any>): string {
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return '';
  }

  const lines: string[] = [];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}: [${value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(', ')}]`);
      }
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    } else {
      const strVal = String(value);
      if (strVal.includes('\n') || strVal.includes(':') || strVal.includes('#') || strVal.includes("'")) {
        lines.push(`${key}: '${strVal.replace(/'/g, "''")}'`);
      } else {
        lines.push(`${key}: '${strVal}'`);
      }
    }
  }

  if (lines.length === 0) return '';
  return `---\n${lines.join('\n')}\n---\n\n`;
}

/**
 * Normalize Callout Type string
 */
export function normalizeCalloutType(typeStr: string): CalloutType {
  const lower = (typeStr || '').toLowerCase();
  if (['note', 'info'].includes(lower)) return 'note';
  if (['tip', 'hint', 'success', 'done'].includes(lower)) return 'tip';
  if (['warning', 'warn', 'alert'].includes(lower)) return 'warning';
  if (['caution', 'danger', 'error', 'bug'].includes(lower)) return 'caution';
  if (['success', 'check'].includes(lower)) return 'success';
  return 'note';
}

/**
 * Deserialize Markdown text into BlockEditorDocument
 */
export function markdownToBlocks(rawMarkdown: string): BlockEditorDocument {
  const frontmatter: Record<string, any> = {};
  let body = rawMarkdown || '';

  // 1. Extract YAML Frontmatter
  const yamlMatch = body.match(/^---[ \t]*\r?\n([\s\S]*?)(?:\r?\n)?[ \t]*---[ \t]*(?:\r?\n)?/);
  if (yamlMatch) {
    body = body.slice(yamlMatch[0].length);
    Object.assign(frontmatter, parseYamlFrontmatter(yamlMatch[1]));
  }

  const lines = body.split(/\r?\n/);
  const blocks: Block[] = [];

  let inCodeBlock = false;
  let codeLang = '';
  let codeBuffer: string[] = [];

  let inCallout = false;
  let calloutType: CalloutType = 'note';
  let calloutBuffer: string[] = [];

  let inQuote = false;
  let quoteBuffer: string[] = [];

  const flushCallout = () => {
    if (inCallout && calloutBuffer.length > 0) {
      blocks.push({
        id: generateBlockId(),
        type: 'callout',
        calloutType,
        content: calloutBuffer.join('\n')
      });
      inCallout = false;
      calloutType = 'note';
      calloutBuffer = [];
    }
  };

  const flushQuote = () => {
    if (inQuote && quoteBuffer.length > 0) {
      blocks.push({
        id: generateBlockId(),
        type: 'quote',
        content: quoteBuffer.join('\n')
      });
      inQuote = false;
      quoteBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code Block Fence
    if (trimmed.startsWith('```')) {
      flushCallout();
      flushQuote();

      if (inCodeBlock) {
        blocks.push({
          id: generateBlockId(),
          type: 'code_block',
          content: codeBuffer.join('\n'),
          language: codeLang || 'text'
        });
        inCodeBlock = false;
        codeBuffer = [];
        codeLang = '';
      } else {
        inCodeBlock = true;
        codeLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // 2. Callout / Admonition: > [!NOTE] or > [!WARNING]
    const calloutStartMatch = line.match(/^>\s*\[!([A-Za-z]+)\]\s*(.*)$/);
    if (calloutStartMatch) {
      flushCallout();
      flushQuote();
      inCallout = true;
      calloutType = normalizeCalloutType(calloutStartMatch[1]);
      const initialText = calloutStartMatch[2].trim();
      if (initialText) {
        calloutBuffer.push(initialText);
      }
      continue;
    }

    // Inside multi-line callout
    if (inCallout) {
      if (line.startsWith('>')) {
        const calloutLine = line.replace(/^>\s?/, '');
        calloutBuffer.push(calloutLine);
        continue;
      } else {
        flushCallout();
      }
    }

    // 3. Blockquote: > Quote text
    if (line.trim().startsWith('>')) {
      flushCallout();
      const quoteLine = line.trim().replace(/^>\s?/, '');
      if (!inQuote) {
        inQuote = true;
        quoteBuffer = [quoteLine];
      } else {
        quoteBuffer.push(quoteLine);
      }
      continue;
    } else if (inQuote) {
      flushQuote();
    }

    // 4. Horizontal Divider (---, ***, ___)
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      flushCallout();
      flushQuote();
      blocks.push({
        id: generateBlockId(),
        type: 'divider',
        content: ''
      });
      continue;
    }

    // 5. Headings H1-H3
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushCallout();
      flushQuote();
      const level = headingMatch[1].length;
      const type: BlockType = level === 1 ? 'heading1' : level === 2 ? 'heading2' : 'heading3';
      blocks.push({
        id: generateBlockId(),
        type,
        content: headingMatch[2].trim()
      });
      continue;
    }

    // 6. Task List Item (To-Do): - [ ] or - [x] or * [ ]
    const todoMatch = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s*(.*)$/);
    if (todoMatch) {
      flushCallout();
      flushQuote();
      const indent = Math.min(Math.floor(todoMatch[1].length / 2), 3);
      const checked = todoMatch[2].toLowerCase() === 'x';
      blocks.push({
        id: generateBlockId(),
        type: 'todo',
        content: todoMatch[3].trim(),
        checked,
        indent
      });
      continue;
    }

    // 7. Bullet List Item: - item or * item or + item
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (bulletMatch) {
      flushCallout();
      flushQuote();
      const indent = Math.min(Math.floor(bulletMatch[1].length / 2), 3);
      blocks.push({
        id: generateBlockId(),
        type: 'bullet_list',
        content: bulletMatch[2].trim(),
        indent
      });
      continue;
    }

    // 8. Numbered List Item: 1. item
    const numMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (numMatch) {
      flushCallout();
      flushQuote();
      const indent = Math.min(Math.floor(numMatch[1].length / 2), 3);
      blocks.push({
        id: generateBlockId(),
        type: 'numbered_list',
        content: numMatch[2].trim(),
        indent
      });
      continue;
    }

    // 9. Empty line
    if (!trimmed) {
      flushCallout();
      flushQuote();
      continue;
    }

    // 10. Standard Paragraph Block
    flushCallout();
    flushQuote();
    blocks.push({
      id: generateBlockId(),
      type: 'paragraph',
      content: line
    });
  }

  // Flush remaining buffers if file ended while inside code/callout/quote
  if (inCodeBlock) {
    blocks.push({
      id: generateBlockId(),
      type: 'code_block',
      content: codeBuffer.join('\n'),
      language: codeLang || 'text'
    });
  }
  flushCallout();
  flushQuote();

  // Ensure at least one block exists
  if (blocks.length === 0) {
    blocks.push({
      id: generateBlockId(),
      type: 'paragraph',
      content: ''
    });
  }

  return { frontmatter, blocks };
}

/**
 * Serialize BlockEditorDocument into clean standard Markdown text
 */
export function blocksToMarkdown(doc: BlockEditorDocument): string {
  const parts: string[] = [];

  // 1. YAML Frontmatter
  if (doc.frontmatter && Object.keys(doc.frontmatter).length > 0) {
    parts.push(serializeYamlFrontmatter(doc.frontmatter));
  }

  // 2. Blocks
  const blocks = doc.blocks;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const nextBlock = blocks[i + 1];
    const indentStr = '  '.repeat(block.indent || 0);

    switch (block.type) {
      case 'heading1':
        parts.push(`# ${block.content}\n\n`);
        break;

      case 'heading2':
        parts.push(`## ${block.content}\n\n`);
        break;

      case 'heading3':
        parts.push(`### ${block.content}\n\n`);
        break;

      case 'bullet_list': {
        const isLastInList = !nextBlock || nextBlock.type !== 'bullet_list';
        parts.push(`${indentStr}- ${block.content}\n${isLastInList ? '\n' : ''}`);
        break;
      }

      case 'numbered_list': {
        const isLastInList = !nextBlock || nextBlock.type !== 'numbered_list';
        parts.push(`${indentStr}1. ${block.content}\n${isLastInList ? '\n' : ''}`);
        break;
      }

      case 'todo': {
        const isLastInList = !nextBlock || nextBlock.type !== 'todo';
        parts.push(`${indentStr}- [${block.checked ? 'x' : ' '}] ${block.content}\n${isLastInList ? '\n' : ''}`);
        break;
      }

      case 'quote': {
        const quoteLines = block.content.split('\n').map(l => `> ${l}`).join('\n');
        parts.push(`${quoteLines}\n\n`);
        break;
      }

      case 'callout': {
        const calloutTypeTag = (block.calloutType || 'note').toUpperCase();
        const contentLines = (block.content || '').split('\n').map(l => `> ${l}`).join('\n');
        parts.push(`> [!${calloutTypeTag}]\n${contentLines}\n\n`);
        break;
      }

      case 'code_block':
        parts.push(`\`\`\`${block.language || 'typescript'}\n${block.content || ''}\n\`\`\`\n\n`);
        break;

      case 'divider':
        parts.push(`---\n\n`);
        break;

      case 'paragraph':
      default:
        parts.push(`${block.content}\n\n`);
        break;
    }
  }

  return parts.join('').trimEnd() + '\n';
}
