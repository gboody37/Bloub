/**
 * Tier 2 & Tier 3 Integration Tests: AI Quiz Generation & Hint Endpoints
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MockGeminiClient } from '../mocks/mock-gemini.ts';
import type { QuizResponse, EvaluationResponse } from '../mocks/mock-gemini.ts';
import { sampleValidNote } from '../fixtures/sample-notes.ts';

interface QuizApiRequest {
  apiKey?: string;
  model?: string;
  noteTitle?: string;
  noteContent?: string;
  config?: {
    questionCount?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    types?: Array<'multiple_choice' | 'short_answer' | 'true_false'>;
  };
}

interface ApiResponse<T = any> {
  statusCode: number;
  data: {
    success: boolean;
    quiz?: T;
    hint?: string;
    evaluation?: EvaluationResponse;
    error?: string;
    message?: string;
    retryAfterMs?: number;
  };
}

/**
 * Controller simulator for POST /api/ai/quiz/generate
 */
export async function handleGenerateQuiz(req: QuizApiRequest): Promise<ApiResponse<QuizResponse>> {
  if (!req.apiKey || req.apiKey.trim() === '') {
    return {
      statusCode: 400,
      data: { success: false, error: 'API_KEY_REQUIRED', message: 'Gemini API key is required.' }
    };
  }

  if (!req.noteContent || req.noteContent.trim() === '') {
    return {
      statusCode: 400,
      data: { success: false, error: 'NOTE_CONTENT_REQUIRED', message: 'Note content cannot be empty.' }
    };
  }

  try {
    const quiz = await MockGeminiClient.generateQuiz({
      apiKey: req.apiKey,
      model: req.model || 'gemini-2.5-flash',
      noteTitle: req.noteTitle || 'Untitled Note',
      noteContent: req.noteContent,
      config: req.config
    });

    return {
      statusCode: 200,
      data: { success: true, quiz }
    };
  } catch (err: any) {
    const statusCode = err.statusCode || (err.message.includes('API_KEY_REQUIRED') ? 400 : 500);
    return {
      statusCode,
      data: {
        success: false,
        error: err.message.split(':')[0],
        message: err.message,
        retryAfterMs: err.retryAfterMs
      }
    };
  }
}

/**
 * Controller simulator for POST /api/ai/hint
 */
export async function handleGenerateHint(req: { apiKey?: string; question?: string; noteContext?: string }): Promise<ApiResponse> {
  if (!req.apiKey) {
    return { statusCode: 400, data: { success: false, error: 'API_KEY_REQUIRED' } };
  }
  if (!req.question) {
    return { statusCode: 400, data: { success: false, error: 'QUESTION_REQUIRED' } };
  }

  try {
    const res = await MockGeminiClient.generateHint({
      apiKey: req.apiKey,
      question: req.question,
      noteContext: req.noteContext || ''
    });
    return { statusCode: 200, data: { success: true, hint: res.hint } };
  } catch (err: any) {
    return { statusCode: 500, data: { success: false, error: err.message } };
  }
}

describe('AI Quiz Generation API Route Integration (Tier 2 & Tier 3)', () => {
  it('T3.1: should return 200 OK with valid quiz payload when given valid note and key', async () => {
    const res = await handleGenerateQuiz({
      apiKey: 'AIzaSyValidDemoApiKey12345',
      noteTitle: 'Antigravity Agent Architecture',
      noteContent: sampleValidNote,
      config: { questionCount: 3 }
    });

    assert.equal(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.quiz);
    assert.equal(res.data.quiz?.questions.length, 3);
  });

  it('T3.2: should return 400 Bad Request when API key is missing', async () => {
    const res = await handleGenerateQuiz({
      apiKey: '',
      noteTitle: 'Antigravity Agent Architecture',
      noteContent: sampleValidNote
    });

    assert.equal(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert.equal(res.data.error, 'API_KEY_REQUIRED');
  });

  it('T3.3: should return 400 Bad Request when note content is empty', async () => {
    const res = await handleGenerateQuiz({
      apiKey: 'AIzaSyValidDemoApiKey12345',
      noteTitle: 'Empty Note',
      noteContent: ''
    });

    assert.equal(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert.equal(res.data.error, 'NOTE_CONTENT_REQUIRED');
  });

  it('T3.4: should return 401 Unauthorized when invalid API key is passed', async () => {
    const res = await handleGenerateQuiz({
      apiKey: 'REVOKED_OR_INVALID_KEY',
      noteTitle: 'Test Note',
      noteContent: sampleValidNote
    });

    assert.equal(res.statusCode, 401);
    assert.strictEqual(res.data.success, false);
    assert.equal(res.data.error, 'INVALID_API_KEY');
  });

  it('T3.5: should return 429 with retry metadata when rate limit is exceeded', async () => {
    const res = await handleGenerateQuiz({
      apiKey: 'TRIGGER_RATE_LIMIT',
      noteTitle: 'Test Note',
      noteContent: sampleValidNote
    });

    assert.equal(res.statusCode, 429);
    assert.strictEqual(res.data.success, false);
    assert.equal(res.data.error, 'RATE_LIMIT_EXCEEDED');
    assert.equal(res.data.retryAfterMs, 5000);
  });

  it('T3.6: should return Socratic hints for Bloub mascot on /api/ai/hint', async () => {
    const res = await handleGenerateHint({
      apiKey: 'AIzaSyValidDemoApiKey12345',
      question: 'Which core component in Antigravity Agent Architecture handles progressive disclosure?',
      noteContext: sampleValidNote
    });

    assert.equal(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.hint && res.data.hint.includes('Bloub'));
  });
});
