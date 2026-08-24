import { NextRequest, NextResponse } from 'next/server';
import { QuizService } from '@/lib/ai/quiz';
import type { QuizConfig } from '@/types/quiz';

interface QuizRouteRequestBody {
  apiKey?: string;
  action?: 'generate' | 'hint' | 'evaluate' | 'test-key' | 'test-connection';
  model?: string;
  question?: string;
  noteTitle?: string;
  noteContent?: string;
  noteContext?: string;
  userAnswer?: string;
  expectedAnswer?: string;
  config?: QuizConfig;
  useMock?: boolean;
}

interface CustomHttpError extends Error {
  statusCode?: number;
  retryAfterMs?: number;
}

export async function POST(req: NextRequest) {
  try {
    let body: QuizRouteRequestBody = {};
    try {
      body = (await req.json()) as QuizRouteRequestBody;
    } catch {
      body = {};
    }

    // Extract API key from header or body
    const headerKey = req.headers.get('x-gemini-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const apiKey = (body.apiKey || headerKey || '').trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'API_KEY_REQUIRED',
          message: 'Gemini API key is required to generate AI quizzes.'
        },
        { status: 400 }
      );
    }

    const action = body.action || 'generate';

    // Socratic Hint Action
    if (action === 'hint') {
      if (!body.question || body.question.trim() === '') {
        return NextResponse.json(
          {
            success: false,
            error: 'QUESTION_REQUIRED',
            message: 'Question text is required for hint generation.'
          },
          { status: 400 }
        );
      }

      const hintResult = await QuizService.generateHint({
        apiKey,
        model: body.model,
        question: body.question,
        noteContext: body.noteContext || body.noteContent || '',
        useMock: body.useMock
      });

      return NextResponse.json(
        {
          success: true,
          hint: hintResult.hint
        },
        { status: 200 }
      );
    }

    // Conceptual Answer Evaluation Action
    if (action === 'evaluate') {
      if (!body.question || body.question.trim() === '') {
        return NextResponse.json(
          {
            success: false,
            error: 'QUESTION_REQUIRED',
            message: 'Question is required for evaluation.'
          },
          { status: 400 }
        );
      }

      const evalResult = await QuizService.evaluateAnswer({
        apiKey,
        model: body.model,
        question: body.question,
        userAnswer: body.userAnswer || '',
        expectedAnswer: body.expectedAnswer,
        noteContext: body.noteContext || body.noteContent,
        useMock: body.useMock
      });

      return NextResponse.json(
        {
          success: true,
          evaluation: evalResult
        },
        { status: 200 }
      );
    }

    // Connection Test Action
    if (action === 'test-key' || action === 'test-connection') {
      const testResult = await QuizService.testConnection(apiKey, body.model, body.useMock);
      return NextResponse.json(
        {
          success: testResult.valid,
          valid: testResult.valid,
          message: testResult.message,
          model: testResult.model
        },
        { status: testResult.valid ? 200 : 401 }
      );
    }

    // Default: Quiz Generation
    const noteContent = (body.noteContent || '').trim();
    if (!noteContent) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOTE_CONTENT_REQUIRED',
          message: 'Note content cannot be empty.'
        },
        { status: 400 }
      );
    }

    const quiz = await QuizService.generateQuiz({
      apiKey,
      model: body.model || 'gemini-2.0-flash',
      noteTitle: body.noteTitle || 'Study Note',
      noteContent,
      config: body.config,
      useMock: body.useMock
    });

    return NextResponse.json(
      {
        success: true,
        quiz
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const customErr = err as CustomHttpError;
    const errorString = customErr?.message || 'Internal Server Error';
    let statusCode = customErr?.statusCode;

    if (!statusCode) {
      if (errorString.includes('API_KEY_REQUIRED') || errorString.includes('NOTE_CONTENT_REQUIRED') || errorString.includes('QUESTION_REQUIRED')) {
        statusCode = 400;
      } else if (errorString.includes('INVALID_API_KEY')) {
        statusCode = 401;
      } else if (errorString.includes('RATE_LIMIT_EXCEEDED')) {
        statusCode = 429;
      } else {
        statusCode = 500;
      }
    }

    const errorCode = errorString.split(':')[0].trim();

    return NextResponse.json(
      {
        success: false,
        error: errorCode,
        message: errorString,
        retryAfterMs: customErr?.retryAfterMs
      },
      { status: statusCode }
    );
  }
}
