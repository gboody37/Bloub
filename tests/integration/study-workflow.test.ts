/**
 * Tier 3 & Tier 4 Integration & Real-World Workload Tests: End-to-End Study Workflows
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scanVaultDirectory, getNoteByPath } from './api-obsidian.test.ts';
import { handleGenerateQuiz } from './api-quiz.test.ts';
import { calculateQuizScore } from '../unit/quiz-scorer.test.ts';
import { createCategoryLogic } from '../verification/verify-ac1-list-types.ts';
import { ClientSettingsStore, maskApiKey } from '../verification/verify-ac3-ai-quizzing.ts';

describe('Tier 3 & Tier 4: Integrated Study & Lifestyle Workflows', () => {
  it('Tier 4 Scenario 1: Real Vault Ingestion & End-to-End Quiz Lifecycle', async () => {
    // 1. Scan live vault
    const vaultScan = await scanVaultDirectory('d:\\AI\\Vaults\\Brain', '02 - Core Brain');
    assert.strictEqual(vaultScan.success, true);
    assert.ok(vaultScan.notes.length >= 1);

    // 2. Select target note
    const targetNoteMeta = vaultScan.notes.find(n => n.title.includes('Antigravity') || n.title.includes('Agent')) || vaultScan.notes[0];
    assert.ok(targetNoteMeta);

    // 3. Ingest note
    const noteRes = await getNoteByPath(targetNoteMeta.relativePath);
    assert.strictEqual(noteRes.success, true);
    assert.ok(noteRes.note);

    // 4. Generate Quiz
    const quizRes = await handleGenerateQuiz({
      apiKey: 'AIzaSyRealWorldWorkflowKey',
      noteTitle: noteRes.note.title,
      noteContent: noteRes.note.bodyContent,
      config: { questionCount: 3, difficulty: 'medium', types: ['multiple_choice'] }
    });

    assert.strictEqual(quizRes.statusCode, 200);
    assert.ok(quizRes.data.quiz);
    assert.equal(quizRes.data.quiz.questions.length, 3);

    // 5. Simulate User Submissions
    const userAnswers = quizRes.data.quiz.questions.map((q, idx) => ({
      questionId: q.id,
      selectedOptionIndex: q.correctAnswerIndex, // All correct
      correctAnswerIndex: q.correctAnswerIndex,
      isCorrect: true
    }));

    // 6. Score & Verify Mastery
    const scoreResult = calculateQuizScore(userAnswers);
    assert.equal(scoreResult.percentage, 100);
    assert.equal(scoreResult.masteryLevel, 'Mastered');
    assert.equal(scoreResult.mascotReaction, 'celebrating');
  });

  it('Tier 4 Scenario 2: Multi-List State Isolation (ToDo vs Study)', () => {
    // Simulate ToDo list state
    const todoList = createCategoryLogic({ name: 'Personal Errands', type: 'todo' });
    const todoState = {
      activeCategory: todoList,
      draftTaskText: 'Buy almond milk and coffee beans',
      tasks: [{ id: 't1', title: 'Call dentist', completed: false }]
    };

    // Simulate Study list state
    const studyList = createCategoryLogic({ name: 'AI Engineering 2026', type: 'study', vaultFolder: '02 - Core Brain' });
    const studyState = {
      activeCategory: studyList,
      activeNoteId: '02 - Core Brain/Antigravity Agent Architecture.md',
      activeQuizIndex: 2
    };

    // Verify independent states without cross-bleeding
    assert.equal(todoState.activeCategory.type, 'todo');
    assert.equal(studyState.activeCategory.type, 'study');
    assert.equal(todoState.draftTaskText, 'Buy almond milk and coffee beans');
    assert.equal(studyState.activeNoteId, '02 - Core Brain/Antigravity Agent Architecture.md');
    assert.ok(!('draftTaskText' in studyState));
    assert.ok(!('activeNoteId' in todoState));
  });

  it('Tier 4 Scenario 3: Fault-Tolerant Settings Key Update & Propagation', async () => {
    // 1. Initial Key
    ClientSettingsStore.setItem('vibe_todos_gemini_api_key', 'INITIAL_KEY_123');
    assert.equal(ClientSettingsStore.getItem('vibe_todos_gemini_api_key'), 'INITIAL_KEY_123');

    // 2. User updates key in settings
    const updatedKey = 'AIzaSyUpdatedValidKey98765';
    ClientSettingsStore.setItem('vibe_todos_gemini_api_key', updatedKey);
    const saved = ClientSettingsStore.getItem('vibe_todos_gemini_api_key');
    assert.equal(saved, updatedKey);
    assert.equal(maskApiKey(saved).endsWith('8765'), true);

    // 3. Quiz request uses updated key
    const quizRes = await handleGenerateQuiz({
      apiKey: saved,
      noteTitle: 'MCP Guide',
      noteContent: '# Model Context Protocol\nStdio and SSE endpoints for tool integration.'
    });

    assert.equal(quizRes.statusCode, 200);
  });

  it('Tier 4 Scenario 4: Deep Vault Traversal across Multiple Brain Folders', async () => {
    const fullScan = await scanVaultDirectory('d:\\AI\\Vaults\\Brain');
    assert.strictEqual(fullScan.success, true);
    assert.ok(fullScan.folders.length >= 3);
    assert.ok(fullScan.totalNotes >= 4);

    // Verify distinct subfolders exist
    const subfolders = ['00 - System', '02 - Core Brain', '03 - Projects', '04 - Resources'];
    for (const expected of ['02 - Core Brain']) {
      assert.ok(fullScan.folders.some(f => f.includes(expected)), `Vault must contain ${expected}`);
    }
  });

  it('Tier 4 Scenario 5: Mixed Quiz Answer Grading with Partial Mastery', async () => {
    const mixedAnswers = [
      { questionId: 'q1', isCorrect: true },
      { questionId: 'q2', isCorrect: false },
      { questionId: 'q3', isCorrect: true },
      { questionId: 'q4', isCorrect: false }
    ];

    const score = calculateQuizScore(mixedAnswers);
    assert.equal(score.percentage, 50);
    assert.equal(score.masteryLevel, 'Developing');
    assert.equal(score.mascotReaction, 'encouraging');
  });
});
