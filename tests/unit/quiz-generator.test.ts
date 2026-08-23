/**
 * Tier 1 & Tier 2 Unit Tests: AI Quiz Generator Engine & Schema Contracts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MockGeminiClient } from '../mocks/mock-gemini.ts';
import type { QuizQuestion, QuizResponse } from '../mocks/mock-gemini.ts';
import { sampleValidNote } from '../fixtures/sample-notes.ts';

const VALID_TEST_KEY = 'AIzaSyMockValidApiKey123456789';

describe('AI Quiz Generator Engine (Tier 1: Feature Coverage)', () => {
  it('T1.1: should generate a structured quiz matching requested question count', async () => {
    const response: QuizResponse = await MockGeminiClient.generateQuiz({
      apiKey: VALID_TEST_KEY,
      noteTitle: 'Antigravity Agent Architecture',
      noteContent: sampleValidNote,
      config: { questionCount: 4 }
    });

    assert.equal(response.questions.length, 4);
    assert.ok(response.quizTitle.includes('Antigravity Agent Architecture'));
    assert.ok(response.summary.length > 10);
  });

  it('T1.2: should enforce strict Multiple Choice schema (4 options, valid answer index)', async () => {
    const response = await MockGeminiClient.generateQuiz({
      apiKey: VALID_TEST_KEY,
      noteTitle: 'Antigravity Agent Architecture',
      noteContent: sampleValidNote,
      config: { questionCount: 2, types: ['multiple_choice'] }
    });

    for (const q of response.questions) {
      assert.equal(q.type, 'multiple_choice');
      assert.ok(Array.isArray(q.options), 'Options must be an array');
      assert.equal(q.options.length, 4, 'Multiple choice must have exactly 4 choices');
      assert.equal(typeof q.correctAnswerIndex, 'number');
      assert.ok(q.correctAnswerIndex >= 0 && q.correctAnswerIndex < 4);
      assert.ok(q.options[q.correctAnswerIndex].length > 0);
      assert.ok(q.explanation.length > 10);
      assert.ok(q.sourceCitation.length > 5);
    }
  });

  it('T1.3: should generate True/False questions with 2 options', async () => {
    const response = await MockGeminiClient.generateQuiz({
      apiKey: VALID_TEST_KEY,
      noteTitle: 'Antigravity Agent Architecture',
      noteContent: sampleValidNote,
      config: { questionCount: 1, types: ['true_false'] }
    });

    const q = response.questions[0];
    assert.equal(q.type, 'true_false');
    assert.deepEqual(q.options, ['True', 'False']);
    assert.equal(q.correctAnswerIndex, 0);
  });

  it('T1.4: should generate Short Answer questions with expected answer criteria', async () => {
    const response = await MockGeminiClient.generateQuiz({
      apiKey: VALID_TEST_KEY,
      noteTitle: 'Antigravity Agent Architecture',
      noteContent: sampleValidNote,
      config: { questionCount: 1, types: ['short_answer'] }
    });

    const q = response.questions[0];
    assert.equal(q.type, 'short_answer');
    assert.ok(q.correctAnswerText && q.correctAnswerText.length > 10);
  });

  it('T1.5: should include non-hallucinated source citations from note content', async () => {
    const response = await MockGeminiClient.generateQuiz({
      apiKey: VALID_TEST_KEY,
      noteTitle: 'Antigravity Agent Architecture',
      noteContent: sampleValidNote,
      config: { questionCount: 2 }
    });

    for (const q of response.questions) {
      assert.ok(q.sourceCitation, 'Each question must have a source citation');
      // Verify citation concepts correspond to note text
      const noteLower = sampleValidNote.toLowerCase();
      const citationWords = q.sourceCitation.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      const matched = citationWords.some(w => noteLower.includes(w));
      assert.ok(matched, 'Source citation should reference real terms from the note');
    }
  });
});

describe('AI Quiz Generator Boundaries & Failure Resilience (Tier 2)', () => {
  it('T2.1: should reject quiz generation when API key is missing', async () => {
    await assert.rejects(
      async () => {
        await MockGeminiClient.generateQuiz({
          apiKey: '',
          noteTitle: 'Test',
          noteContent: sampleValidNote
        });
      },
      /API_KEY_REQUIRED/
    );
  });

  it('T2.2: should catch invalid / revoked Gemini API key (401 Unauthorized)', async () => {
    await assert.rejects(
      async () => {
        await MockGeminiClient.generateQuiz({
          apiKey: 'REVOKED_OR_INVALID_KEY',
          noteTitle: 'Test',
          noteContent: sampleValidNote
        });
      },
      (err: any) => {
        return err.message.includes('INVALID_API_KEY') && err.statusCode === 401;
      }
    );
  });

  it('T2.3: should handle rate limits (429 Too Many Requests) with retry metadata', async () => {
    await assert.rejects(
      async () => {
        await MockGeminiClient.generateQuiz({
          apiKey: 'TRIGGER_RATE_LIMIT',
          noteTitle: 'Test',
          noteContent: sampleValidNote
        });
      },
      (err: any) => {
        return err.message.includes('RATE_LIMIT_EXCEEDED') && err.statusCode === 429 && err.retryAfterMs === 5000;
      }
    );
  });

  it('T2.4: should provide Socratic hints without revealing correct option index', async () => {
    const hint = await MockGeminiClient.generateHint({
      apiKey: VALID_TEST_KEY,
      question: 'Which core component in Antigravity Agent Architecture handles progressive disclosure?',
      noteContext: sampleValidNote
    });

    assert.ok(hint.hint.includes('Bloub'));
    assert.ok(!hint.hint.includes('Option 0') && !hint.hint.includes('Index 0'), 'Hint must not leak option index');
  });

  it('T2.5: should evaluate conceptual student answers accurately', async () => {
    const goodEval = await MockGeminiClient.evaluateAnswer({
      apiKey: VALID_TEST_KEY,
      question: 'Explain the Antigravity architecture.',
      userAnswer: 'It is a modular agent system using progressive disclosure and MCP for context-driven iteration.'
    });

    assert.ok(goodEval.isCorrect);
    assert.ok(goodEval.score >= 70);
    assert.ok(goodEval.keyPointsCovered.length >= 2);

    const emptyEval = await MockGeminiClient.evaluateAnswer({
      apiKey: VALID_TEST_KEY,
      question: 'Explain the Antigravity architecture.',
      userAnswer: ''
    });

    assert.strictEqual(emptyEval.isCorrect, false);
    assert.equal(emptyEval.score, 0);
  });
});
