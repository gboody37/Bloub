/**
 * Test Fixtures: Sample Obsidian Notes and Edge Case Payloads
 */

export const sampleValidNote = `---
tags:
  - concept
  - brain
  - antigravity
  - agent
status: Complete
created: 2026-08-10
modified: 2026-08-10
aliases:
  - Antigravity
  - AGY Architecture
---

# 🤖 Antigravity Agent Architecture

**Antigravity** is Google DeepMind's advanced agentic pair-programming system designed for high-autonomy coding, system design, and context-driven iteration.

---

## 🏗️ Core Architecture Components

\`\`\`mermaid
graph TD
    User["USER"] --> Agent["Antigravity Core Agent"]
    Agent --> Context["Context Window (Gemini 3.6 Flash)"]
\`\`\`

## ⚡ Key Capabilities & Mechanisms

### 1. Progressive Disclosure (Skills & Rules)
To prevent prompt context clutter:
- Skills are loaded on-demand when activated.
- Only skill names and short descriptions are injected initially.
- Full instructions enter context only when relevant tool calls occur.

### 2. Multi-Agent Delegation
Antigravity can spawn subagents to work concurrently on research, codebase exploration, or multi-agent teamwork projects.

## 🔗 Related Knowledge Nodes
- [[02 - Core Brain/Model Context Protocol (MCP) Guide|Model Context Protocol (MCP) Guide]]
- [[02 - Core Brain/Obsidian Brain Operating System|Obsidian Brain Operating System]]
- [[00 - System/Dashboards/Agent Skills & Rules|Agent Skills Registry]]
`;

export const malformedYamlNote = `---
tags: [concept, unquoted: colon : error
status: Complete: invalid
created 2026-08-10
---

# Malformed YAML Note

This note has an invalid YAML frontmatter block that should not crash the parser.
It still contains useful markdown text for reading and quizzing.
`;

export const emptyNote = ``;

export const whitespaceNote = `   \n\n\t  \n  `;

export const unicodeNote = `---
tags:
  - جبنة
  - تعلم
  - ذكاء_اصطناعي
status: مكتمل
---

# 🧀 تطبيق جبنة لدراسة الملاحظات

هذا ملف اختباري يحتوي على محتوى باللغة العربية للتحقق من دعم الترميز UTF-8 وعلامات Obsidian باللغة العربية.
`;

export const brokenLinksNote = `---
tags:
  - test
---

# Broken Links Note

Check this [[NonExistentConceptNode]] and [[MissingFolder/AnotherGhostNote|Ghost Link]].
`;

export const dataviewCalloutsNote = `---
tags:
  - dataview
  - callout
---

# Advanced Markdown Features

> [!NOTE] Key Takeaway
> This is a callout box for high priority study points.

\`\`\`dataview
TABLE file.mtime AS "Modified"
FROM "02 - Core Brain"
SORT file.mtime DESC
\`\`\`
`;

export function generateMassiveNote(wordCount = 26000): string {
  const frontmatter = `---
tags:
  - massive
  - benchmark
status: Complete
---

# Massive Benchmark Note

`;
  const paragraph = `Antigravity architecture orchestrates autonomous multi-agent systems with progressive skill disclosure and deterministic verification. `;
  const wordsInParagraph = paragraph.trim().split(/\s+/).length;
  const repeatCount = Math.ceil(wordCount / wordsInParagraph) + 10;
  return frontmatter + paragraph.repeat(repeatCount);
}
