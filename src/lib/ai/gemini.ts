/**
 * Live Google Gemini API Client
 * 
 * Direct REST integration with Google Gemini Generative Language API.
 * Supports structured JSON quiz generation, Socratic hints, conceptual answer grading,
 * and connection verification.
 */

import type {
  QuizQuestion,
  QuizResponse,
  QuizGenerateRequest,
  HintRequest,
  HintResponse,
  EvaluateRequest,
  EvaluationResponse,
  ConnectionTestResult,
  QuizDifficulty,
  QuestionType
} from '@/types/quiz';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiContentPart {
  text: string;
}

interface GeminiContent {
  role?: string;
  parts: GeminiContentPart[];
}

interface GeminiRequestBody {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    topP?: number;
    responseMimeType?: string;
  };
  systemInstruction?: {
    parts: GeminiContentPart[];
  };
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiContentPart[];
  };
}

interface GeminiResponseBody {
  candidates?: GeminiCandidate[];
  error?: {
    message?: string;
    code?: number;
    status?: string;
  };
}

interface CustomHttpError extends Error {
  statusCode?: number;
  retryAfterMs?: number;
}

/**
 * Extracts and repairs JSON object or array from LLM markdown / text responses.
 */
export function extractJsonFromText<T = unknown>(text: string): T {
  if (!text || typeof text !== 'string') {
    throw new Error('MALFORMED_OUTPUT: Response is empty or not a string.');
  }

  const clean = text.trim();

  // Try direct parse first
  try {
    return JSON.parse(clean) as T;
  } catch {
    // Attempt markdown code block extraction
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const match = clean.match(jsonBlockRegex);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim()) as T;
      } catch {
        // continue to substring extraction
      }
    }

    // Attempt to extract from first '{' or '[' to last '}' or ']'
    const firstBrace = clean.indexOf('{');
    const firstBracket = clean.indexOf('[');
    let startIdx = -1;
    let endIdx = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      endIdx = clean.lastIndexOf('}');
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      endIdx = clean.lastIndexOf(']');
    }

    if (startIdx !== -1 && endIdx > startIdx) {
      const candidate = clean.slice(startIdx, endIdx + 1);
      try {
        return JSON.parse(candidate) as T;
      } catch (err: unknown) {
        const parseErr = err as Error;
        throw new Error(`MALFORMED_OUTPUT: Unable to parse structured JSON from LLM response: ${parseErr.message}`);
      }
    }

    throw new Error('MALFORMED_OUTPUT: No valid JSON structure found in LLM response.');
  }
}

export class GeminiClient {
  /**
   * Calls Google Gemini REST generateContent endpoint.
   */
  private static async callGenerateContent(
    apiKey: string,
    model: string,
    prompt: string,
    systemInstruction?: string,
    jsonMode: boolean = false
  ): Promise<string> {
    const selectedModel = model || 'gemini-2.5-flash';
    const url = `${GEMINI_API_BASE}/${selectedModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const bodyPayload: GeminiRequestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        topP: 0.95,
        responseMimeType: jsonMode ? 'application/json' : 'text/plain'
      }
    };

    if (systemInstruction) {
      bodyPayload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyPayload)
      });
    } catch (networkErr: unknown) {
      const netErr = networkErr as Error;
      const err: CustomHttpError = new Error(`NETWORK_ERROR: Failed to connect to Gemini API: ${netErr.message}`);
      err.statusCode = 503;
      throw err;
    }

    if (!res.ok) {
      const errorData = (await res.json().catch(() => ({}))) as GeminiResponseBody;
      const errorMsg = errorData?.error?.message || res.statusText || 'Gemini API Error';
      
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        const err: CustomHttpError = new Error(`INVALID_API_KEY: Provided API key is invalid or unauthorized (${errorMsg}).`);
        err.statusCode = 401;
        throw err;
      }

      if (res.status === 429) {
        const err: CustomHttpError = new Error(`RATE_LIMIT_EXCEEDED: Google AI Gemini rate limit reached (${errorMsg}). Retry in 5000ms.`);
        err.statusCode = 429;
        err.retryAfterMs = 5000;
        throw err;
      }

      const err: CustomHttpError = new Error(`GEMINI_API_ERROR: HTTP ${res.status} - ${errorMsg}`);
      err.statusCode = res.status;
      throw err;
    }

    const data = (await res.json()) as GeminiResponseBody;
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      const err: CustomHttpError = new Error('MALFORMED_OUTPUT: Received empty response from Gemini API.');
      err.statusCode = 502;
      throw err;
    }

    return candidateText;
  }

  /**
   * Generates a structured quiz using Gemini.
   */
  static async generateQuiz(request: QuizGenerateRequest): Promise<QuizResponse> {
    const { apiKey, model = 'gemini-2.5-flash', noteTitle, noteContent, config } = request;

    if (!apiKey || apiKey.trim() === '') {
      const err: CustomHttpError = new Error('API_KEY_REQUIRED: An external LLM API key must be provided.');
      err.statusCode = 400;
      throw err;
    }

    if (!noteContent || noteContent.trim() === '') {
      const err: CustomHttpError = new Error('NOTE_CONTENT_REQUIRED: Note content cannot be empty.');
      err.statusCode = 400;
      throw err;
    }

    const questionCount = Math.max(1, config?.questionCount || 3);
    const difficulty: QuizDifficulty = config?.difficulty || 'medium';
    const types: QuestionType[] = config?.types && config.types.length > 0 ? config.types : ['multiple_choice'];

    const systemPrompt = `You are an expert tutor and study assistant modeled after NotebookLM.
Your task is to generate high-yield, conceptually rigorous quiz questions based ONLY on the provided source note.

Rules:
1. Rely strictly on facts directly mentioned in the note. Do not assume or extrapolate external knowledge.
2. For multiple_choice questions, provide exactly 4 clear, mutually exclusive options. Ensure only ONE option is unmistakably correct. correctAnswerIndex must be a number 0, 1, 2, or 3.
3. For true_false questions, options must be ["True", "False"], correctAnswerIndex must be 0 for True or 1 for False.
4. For short_answer questions, include correctAnswerText explaining the ideal student response.
5. Include a precise explanation citing the specific section or quote from the note in sourceCitation.
6. Output MUST be valid JSON adhering exactly to the requested schema.`;

    const userPrompt = `Generate a ${difficulty} difficulty quiz with ${questionCount} questions based on the following note.

Target question types: ${types.join(', ')}.

Note Title: ${noteTitle || 'Untitled Note'}

Note Content:
${noteContent}

Required JSON Output Schema:
{
  "quizTitle": "string",
  "summary": "string",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice | true_false | short_answer",
      "question": "string",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "correctAnswerText": "string (for short_answer only)",
      "explanation": "string",
      "sourceCitation": "string (verbatim quote or concept reference)",
      "difficulty": "${difficulty}"
    }
  ]
}`;

    const rawOutput = await this.callGenerateContent(apiKey, model, userPrompt, systemPrompt, true);
    const parsed = extractJsonFromText<QuizResponse>(rawOutput);

    if (!parsed || !Array.isArray(parsed.questions)) {
      const err: CustomHttpError = new Error('MALFORMED_OUTPUT: LLM response did not return a valid questions array.');
      err.statusCode = 502;
      throw err;
    }

    // Normalize questions to guarantee schema integrity
    const normalizedQuestions: QuizQuestion[] = parsed.questions.map((q, idx) => {
      const qType: QuestionType = q.type === 'true_false' || q.type === 'short_answer' ? q.type : 'multiple_choice';
      let options = q.options;
      let correctAnswerIndex = typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0;

      if (qType === 'multiple_choice') {
        if (!Array.isArray(options) || options.length !== 4) {
          options = options && options.length >= 2 ? options.slice(0, 4) : ['Choice A', 'Choice B', 'Choice C', 'Choice D'];
          while (options.length < 4) {
            options.push(`Option ${options.length + 1}`);
          }
        }
        correctAnswerIndex = Math.max(0, Math.min(3, correctAnswerIndex));
      } else if (qType === 'true_false') {
        options = ['True', 'False'];
        correctAnswerIndex = correctAnswerIndex === 1 ? 1 : 0;
      }

      return {
        id: q.id || `quiz-q-${idx + 1}-${Date.now().toString(36)}`,
        type: qType,
        question: q.question || `Question ${idx + 1}`,
        options,
        correctAnswerIndex,
        correctAnswerText: q.correctAnswerText,
        explanation: q.explanation || 'Refer to the source note for explanation.',
        sourceCitation: q.sourceCitation || noteTitle || 'Source Note',
        difficulty: (q.difficulty as QuizDifficulty) || difficulty
      };
    });

    return {
      quizTitle: parsed.quizTitle || `${noteTitle || 'Study Note'} — Mastery Quiz`,
      summary: parsed.summary || `AI study quiz generated for "${noteTitle || 'Study Note'}".`,
      questions: normalizedQuestions
    };
  }

  /**
   * Generates a Socratic hint without spoiling the answer.
   */
  static async generateHint(request: HintRequest): Promise<HintResponse> {
    const { apiKey, model = 'gemini-2.5-flash', question, noteContext } = request;

    if (!apiKey || apiKey.trim() === '') {
      const err: CustomHttpError = new Error('API_KEY_REQUIRED: Missing API key for hint generation.');
      err.statusCode = 400;
      throw err;
    }

    if (!question || question.trim() === '') {
      const err: CustomHttpError = new Error('QUESTION_REQUIRED: Question text cannot be empty.');
      err.statusCode = 400;
      throw err;
    }

    const systemPrompt = `You are Bloub, a friendly, encouraging study mascot.
Provide a 1-to-2 sentence subtle Socratic hint for the given question based on the note context.
DO NOT reveal the answer, correct option index, or exact option text. Guide the user to think for themselves.`;

    const prompt = `Question: ${question}\n\nNote Context:\n${(noteContext || '').slice(0, 3000)}`;

    const text = await this.callGenerateContent(apiKey, model, prompt, systemPrompt, false);
    return {
      hint: text.trim().startsWith('💡') ? text.trim() : `💡 Bloub's Hint: ${text.trim()}`
    };
  }

  /**
   * Evaluates a free-text response against the source note context.
   */
  static async evaluateAnswer(request: EvaluateRequest): Promise<EvaluationResponse> {
    const { apiKey, model = 'gemini-2.5-flash', question, userAnswer, expectedAnswer, noteContext } = request;

    if (!apiKey || apiKey.trim() === '') {
      const err: CustomHttpError = new Error('API_KEY_REQUIRED: Missing API key.');
      err.statusCode = 400;
      throw err;
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

    const systemPrompt = `You are an accurate grading assistant. Evaluate the student's answer to the question based on the note context and expected answer.
Output JSON adhering to this schema:
{
  "score": number (0-100),
  "isCorrect": boolean (score >= 60),
  "feedback": "string",
  "keyPointsCovered": ["string"],
  "missedPoints": ["string"]
}`;

    const prompt = `Question: ${question}
Expected Answer: ${expectedAnswer || 'Accurate conceptual explanation'}
Student Answer: ${userAnswer}
Note Context: ${(noteContext || '').slice(0, 3000)}`;

    const raw = await this.callGenerateContent(apiKey, model, prompt, systemPrompt, true);
    const parsed = extractJsonFromText<EvaluationResponse>(raw);

    const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 50;
    return {
      score,
      isCorrect: score >= 60,
      feedback: parsed.feedback || (score >= 60 ? 'Good understanding!' : 'Needs review.'),
      keyPointsCovered: Array.isArray(parsed.keyPointsCovered) ? parsed.keyPointsCovered : [],
      missedPoints: Array.isArray(parsed.missedPoints) ? parsed.missedPoints : []
    };
  }

  /**
   * Tests API key validity with a lightweight ping.
   */
  static async testConnection(apiKey: string, model: string = 'gemini-2.5-flash'): Promise<ConnectionTestResult> {
    if (!apiKey || apiKey.trim() === '') {
      return { valid: false, message: 'API key cannot be empty.' };
    }

    try {
      await this.callGenerateContent(apiKey, model, 'Respond with the single word "OK".', undefined, false);
      return {
        valid: true,
        message: `Successfully connected to Google Gemini API (Model: ${model}).`,
        model
      };
    } catch (err: unknown) {
      const pingErr = err as Error;
      return {
        valid: false,
        message: pingErr.message || 'Failed to connect to Google Gemini API.'
      };
    }
  }
}
