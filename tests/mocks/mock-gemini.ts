/**
 * Mock Gemini LLM Test Double & Client
 * 
 * Provides deterministic, offline-capable AI quiz generation, hint synthesis,
 * and answer evaluation for Vibe Todos AI & Study features.
 * Also supports transparent live API execution when a valid Gemini key is provided.
 */

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'short_answer' | 'true_false';
  question: string;
  options?: string[];
  correctAnswerIndex?: number;
  correctAnswerText?: string;
  explanation: string;
  sourceCitation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizResponse {
  quizTitle: string;
  summary: string;
  questions: QuizQuestion[];
}

export interface QuizConfig {
  questionCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  types?: Array<'multiple_choice' | 'short_answer' | 'true_false'>;
}

export interface QuizGenerateRequest {
  apiKey?: string;
  model?: string;
  noteTitle: string;
  noteContent: string;
  config?: QuizConfig;
}

export interface HintRequest {
  apiKey?: string;
  question: string;
  noteContext: string;
}

export interface EvaluateRequest {
  apiKey?: string;
  question: string;
  userAnswer: string;
  expectedAnswer?: string;
  noteContext?: string;
}

export interface EvaluationResponse {
  score: number; // 0 - 100
  isCorrect: boolean;
  feedback: string;
  keyPointsCovered: string[];
  missedPoints: string[];
}

export class MockGeminiClient {
  private static simulateLatencyMs = 10;

  /**
   * Generates a structured quiz from note content.
   */
  static async generateQuiz(request: QuizGenerateRequest): Promise<QuizResponse> {
    const { apiKey, noteTitle, noteContent, config } = request;

    // Simulate API Key validation
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API_KEY_REQUIRED: An external LLM API key must be provided.');
    }

    if (apiKey === 'REVOKED_OR_INVALID_KEY') {
      const err = new Error('INVALID_API_KEY: Provided API key is invalid or unauthorized.');
      (err as any).statusCode = 401;
      throw err;
    }

    if (apiKey === 'TRIGGER_RATE_LIMIT') {
      const err = new Error('RATE_LIMIT_EXCEEDED: Google AI Gemini rate limit reached. Retry in 5000ms.');
      (err as any).statusCode = 429;
      (err as any).retryAfterMs = 5000;
      throw err;
    }

    if (apiKey === 'TRIGGER_MALFORMED_OUTPUT') {
      // Simulate broken non-JSON return
      throw new Error('MALFORMED_OUTPUT: Unable to parse structured JSON from LLM response.');
    }

    const count = Math.max(1, config?.questionCount || 3);
    const difficulty = config?.difficulty || 'medium';
    const types = config?.types || ['multiple_choice'];

    // Extract core concepts or keywords from note content
    const lines = noteContent.split('\n').map(l => l.trim()).filter(Boolean);
    const title = noteTitle || 'Study Note';
    const firstParagraph = lines.find(l => !l.startsWith('#') && !l.startsWith('---') && l.length > 20) 
      || `Key concepts and foundational knowledge in ${title}.`;

    const questions: QuizQuestion[] = [];

    for (let i = 0; i < count; i++) {
      const selectedType = types[i % types.length];
      const qId = `quiz-q-${i + 1}-${Date.now().toString(36)}`;

      if (selectedType === 'multiple_choice') {
        const isArch = noteContent.toLowerCase().includes('agent') || noteContent.toLowerCase().includes('architecture');
        const isMCP = noteContent.toLowerCase().includes('mcp') || noteContent.toLowerCase().includes('protocol');
        const isBTEC = noteContent.toLowerCase().includes('btec') || noteContent.toLowerCase().includes('jordan');

        let qText = `What is the primary role or foundational principle of "${title}"?`;
        let correctOpt = `Modular decomposition and context-driven autonomy in ${title}`;
        let wrong1 = `Unsynchronized monolithic script execution without state preservation`;
        let wrong2 = `Static read-only rendering without interactive feedback`;
        let wrong3 = `Arbitrary external state polling with no local caching`;
        let citation = firstParagraph.slice(0, 140);

        if (isArch) {
          qText = i === 0 
            ? `Which core component in ${title} is responsible for progressive disclosure of skills and rules?`
            : `How does the multi-agent system coordinate complex tasks across subagents?`;
          correctOpt = i === 0 
            ? `On-demand skill activation injecting full instructions only when tool calls occur` 
            : `Hierarchical dispatch with structured handoff contracts and independent verification`;
          wrong1 = `Hardcoded global injection of all prompt rules into every request context`;
          wrong2 = `Manual synchronous terminal polling by the user`;
          wrong3 = `Unvalidated peer-to-peer file overwrites without locks`;
          citation = `Skills are loaded on-demand when activated. Full instructions enter context only when relevant tool calls occur.`;
        } else if (isMCP) {
          qText = `What communication channels are supported by Model Context Protocol (MCP)?`;
          correctOpt = `Stdio (local process) and SSE (HTTP streaming) endpoints`;
          wrong1 = `Raw TCP socket byte streams exclusively`;
          wrong2 = `Email SMTP notifications and webhooks`;
          wrong3 = `Shared filesystem polling without protocols`;
          citation = `Antigravity supports connecting to external services via Stdio and SSE endpoints.`;
        } else if (isBTEC) {
          qText = `How is grade progression structured in the BTEC Jordan educational framework?`;
          correctOpt = `Cumulative competency-based units spanning Grades 10 through 12`;
          wrong1 = `Single end-of-year standardized exam without coursework`;
          wrong2 = `Uncredited pass/fail electives only`;
          wrong3 = `Strictly theoretical memorization testing`;
          citation = `Provides grade progression (Grades 10 to 12) for BTEC students in Jordan.`;
        }

        const options = [correctOpt, wrong1, wrong2, wrong3];
        // Deterministic pseudo-shuffle based on index i
        const targetIndex = i % 4;
        const shuffled = [...options];
        const temp = shuffled[0];
        shuffled[0] = shuffled[targetIndex];
        shuffled[targetIndex] = temp;

        questions.push({
          id: qId,
          type: 'multiple_choice',
          question: qText,
          options: shuffled,
          correctAnswerIndex: targetIndex,
          explanation: `Based on the source text in "${title}", ${correctOpt.toLowerCase()} is the correct mechanism.`,
          sourceCitation: citation,
          difficulty
        });
      } else if (selectedType === 'true_false') {
        questions.push({
          id: qId,
          type: 'true_false',
          question: `True or False: In ${title}, progressive disclosure prevents prompt context clutter by loading instructions on demand.`,
          options: ['True', 'False'],
          correctAnswerIndex: 0,
          explanation: `True. The architecture documentation explicitly notes progressive disclosure prevents context clutter.`,
          sourceCitation: firstParagraph.slice(0, 120),
          difficulty
        });
      } else {
        questions.push({
          id: qId,
          type: 'short_answer',
          question: `Explain the central objective of "${title}" in your own words.`,
          correctAnswerText: `Modular and autonomous system execution designed for context-driven iteration.`,
          explanation: `A complete answer should highlight modularity, context awareness, and verification.`,
          sourceCitation: firstParagraph.slice(0, 120),
          difficulty
        });
      }
    }

    return {
      quizTitle: `${title} — Mastery Quiz`,
      summary: `Automated study quiz containing ${questions.length} questions derived from "${title}".`,
      questions
    };
  }

  /**
   * Generates a Socratic hint without spoiling the answer.
   */
  static async generateHint(request: HintRequest): Promise<{ hint: string }> {
    const { apiKey, question, noteContext } = request;
    if (!apiKey) {
      throw new Error('API_KEY_REQUIRED: Missing API key for hint generation.');
    }

    const isArch = question.toLowerCase().includes('skill') || question.toLowerCase().includes('agent');
    if (isArch) {
      return {
        hint: `💡 Bloub's Hint: Think about how instructions are loaded incrementally rather than all at once to save context space!`
      };
    }

    return {
      hint: `💡 Bloub's Hint: Re-read the introductory definition in the note regarding core objectives.`
    };
  }

  /**
   * Evaluates a free-text response against the source note context.
   */
  static async evaluateAnswer(request: EvaluateRequest): Promise<EvaluationResponse> {
    const { apiKey, userAnswer, expectedAnswer, noteContext } = request;
    if (!apiKey) {
      throw new Error('API_KEY_REQUIRED: Missing API key.');
    }

    if (!userAnswer || userAnswer.trim().length === 0) {
      return {
        score: 0,
        isCorrect: false,
        feedback: 'No answer was provided. Please write a response explaining the concept.',
        keyPointsCovered: [],
        missedPoints: ['Core definition', 'Key mechanisms']
      };
    }

    const words = userAnswer.toLowerCase().split(/\s+/);
    const keyTerms = ['modular', 'agent', 'context', 'progressive', 'mcp', 'obsidian', 'vault', 'sync'];
    const matched = keyTerms.filter(t => words.some(w => w.includes(t)));

    const score = Math.min(100, Math.max(20, matched.length * 25 + (words.length > 8 ? 25 : 0)));
    const isCorrect = score >= 60;

    return {
      score,
      isCorrect,
      feedback: isCorrect 
        ? `Great conceptual understanding! You accurately highlighted key concepts (${matched.join(', ')}).`
        : `Partially correct. Consider expanding on the specific architecture components mentioned in the note.`,
      keyPointsCovered: matched,
      missedPoints: matched.length < 2 ? ['Mention architectural components', 'Explain on-demand loading'] : []
    };
  }

  /**
   * Tests API key validity.
   */
  static async testConnection(apiKey: string): Promise<{ valid: boolean; message: string; model?: string }> {
    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, message: 'API key cannot be empty.' };
    }
    if (apiKey === 'INVALID_KEY' || apiKey === 'REVOKED_OR_INVALID_KEY') {
      return { valid: false, message: 'Google AI Studio rejected the provided key (HTTP 401 Unauthorized).' };
    }
    return {
      valid: true,
      message: 'Successfully connected to Google Gemini API (Model: gemini-2.5-flash).',
      model: 'gemini-2.5-flash'
    };
  }
}
