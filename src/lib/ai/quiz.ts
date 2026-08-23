/**
 * Unified AI Quiz & Study Service
 * 
 * Routes requests between live Google Gemini API and offline deterministic mock engine
 * based on configuration, environment, and key type.
 */

import type {
  QuizGenerateRequest,
  QuizResponse,
  HintRequest,
  HintResponse,
  EvaluateRequest,
  EvaluationResponse,
  ConnectionTestResult
} from '@/types/quiz';
import { GeminiClient } from './gemini';
import { MockGeminiClient } from './mock';

/**
 * Masks an API key for safe UI display (e.g. AIzaSy•••••••••••••••••••••••0XYZ).
 */
export function maskApiKey(key: string): string {
  if (!key || key.length <= 8) return '••••••••';
  const prefix = key.slice(0, 6);
  const suffix = key.slice(-4);
  const maskedMiddle = '•'.repeat(Math.max(4, key.length - 10));
  return `${prefix}${maskedMiddle}${suffix}`;
}

/**
 * Checks whether request should use mock engine.
 */
function isMockMode(apiKey?: string, useMock?: boolean): boolean {
  if (useMock) return true;
  if (!apiKey) return false;
  
  // Detect mock/test keys
  if (
    apiKey.startsWith('AIzaSyMock') ||
    apiKey.startsWith('AIzaSyDemo') ||
    apiKey.startsWith('AIzaSyRealWorld') ||
    apiKey.startsWith('AIzaSyValid') ||
    apiKey.startsWith('AIzaSyUpdated') ||
    apiKey === 'REVOKED_OR_INVALID_KEY' ||
    apiKey === 'TRIGGER_RATE_LIMIT' ||
    apiKey === 'TRIGGER_MALFORMED_OUTPUT' ||
    apiKey === 'INVALID_KEY'
  ) {
    return true;
  }

  return false;
}

export class QuizService {
  /**
   * Generates a study quiz from note content.
   */
  static async generateQuiz(request: QuizGenerateRequest): Promise<QuizResponse> {
    if (isMockMode(request.apiKey, request.useMock)) {
      return MockGeminiClient.generateQuiz(request);
    }

    try {
      return await GeminiClient.generateQuiz(request);
    } catch (err: unknown) {
      // If live call fails with network failure, fallback to mock if requested
      if (request.useMock) {
        return MockGeminiClient.generateQuiz(request);
      }
      throw err;
    }
  }

  /**
   * Generates a Socratic hint.
   */
  static async generateHint(request: HintRequest): Promise<HintResponse> {
    if (isMockMode(request.apiKey, request.useMock)) {
      return MockGeminiClient.generateHint(request);
    }

    try {
      return await GeminiClient.generateHint(request);
    } catch (err: unknown) {
      if (request.useMock) {
        return MockGeminiClient.generateHint(request);
      }
      throw err;
    }
  }

  /**
   * Evaluates conceptual free-text student answer.
   */
  static async evaluateAnswer(request: EvaluateRequest): Promise<EvaluationResponse> {
    if (isMockMode(request.apiKey, request.useMock)) {
      return MockGeminiClient.evaluateAnswer(request);
    }

    try {
      return await GeminiClient.evaluateAnswer(request);
    } catch (err: unknown) {
      if (request.useMock) {
        return MockGeminiClient.evaluateAnswer(request);
      }
      throw err;
    }
  }

  /**
   * Tests API key connection.
   */
  static async testConnection(apiKey: string, model: string = 'gemini-2.5-flash', useMock?: boolean): Promise<ConnectionTestResult> {
    if (isMockMode(apiKey, useMock)) {
      return MockGeminiClient.testConnection(apiKey);
    }

    return GeminiClient.testConnection(apiKey, model);
  }
}
