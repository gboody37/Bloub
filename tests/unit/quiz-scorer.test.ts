/**
 * Tier 1 & Tier 2 Unit Tests: Quiz Scorer & Mascot Reaction Calculator
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface UserAnswerRecord {
  questionId: string;
  selectedOptionIndex?: number;
  correctAnswerIndex?: number;
  isCorrect: boolean;
  timeSpentSeconds?: number;
}

export interface QuizScoreResult {
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  masteryLevel: 'Mastered' | 'Proficient' | 'Developing' | 'Needs Review';
  mascotReaction: 'celebrating' | 'proud' | 'encouraging' | 'studying';
  accuracyByTag?: Record<string, number>;
}

/**
 * Calculates quiz scoring and mastery outcomes.
 */
export function calculateQuizScore(answers: UserAnswerRecord[]): QuizScoreResult {
  const totalQuestions = answers.length;
  if (totalQuestions === 0) {
    return {
      totalQuestions: 0,
      correctAnswers: 0,
      percentage: 0,
      masteryLevel: 'Needs Review',
      mascotReaction: 'studying'
    };
  }

  const correctAnswers = answers.filter(a => a.isCorrect).length;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  let masteryLevel: QuizScoreResult['masteryLevel'];
  let mascotReaction: QuizScoreResult['mascotReaction'];

  if (percentage >= 85) {
    masteryLevel = 'Mastered';
    mascotReaction = 'celebrating';
  } else if (percentage >= 70) {
    masteryLevel = 'Proficient';
    mascotReaction = 'proud';
  } else if (percentage >= 50) {
    masteryLevel = 'Developing';
    mascotReaction = 'encouraging';
  } else {
    masteryLevel = 'Needs Review';
    mascotReaction = 'encouraging';
  }

  return {
    totalQuestions,
    correctAnswers,
    percentage,
    masteryLevel,
    mascotReaction
  };
}

describe('Quiz Scorer & Mastery Analytics (Tier 1: Feature Coverage)', () => {
  it('T1.1: should grade a perfect score (100%) and trigger celebrating mascot', () => {
    const answers: UserAnswerRecord[] = [
      { questionId: 'q1', isCorrect: true },
      { questionId: 'q2', isCorrect: true },
      { questionId: 'q3', isCorrect: true },
      { questionId: 'q4', isCorrect: true }
    ];

    const result = calculateQuizScore(answers);
    assert.equal(result.totalQuestions, 4);
    assert.equal(result.correctAnswers, 4);
    assert.equal(result.percentage, 100);
    assert.equal(result.masteryLevel, 'Mastered');
    assert.equal(result.mascotReaction, 'celebrating');
  });

  it('T1.2: should calculate proficient score (75%) and trigger proud mascot', () => {
    const answers: UserAnswerRecord[] = [
      { questionId: 'q1', isCorrect: true },
      { questionId: 'q2', isCorrect: true },
      { questionId: 'q3', isCorrect: true },
      { questionId: 'q4', isCorrect: false }
    ];

    const result = calculateQuizScore(answers);
    assert.equal(result.percentage, 75);
    assert.equal(result.masteryLevel, 'Proficient');
    assert.equal(result.mascotReaction, 'proud');
  });

  it('T1.3: should calculate developing score (50%) and trigger encouraging mascot', () => {
    const answers: UserAnswerRecord[] = [
      { questionId: 'q1', isCorrect: true },
      { questionId: 'q2', isCorrect: false }
    ];

    const result = calculateQuizScore(answers);
    assert.equal(result.percentage, 50);
    assert.equal(result.masteryLevel, 'Developing');
    assert.equal(result.mascotReaction, 'encouraging');
  });
});

describe('Quiz Scorer Boundary & Edge Cases (Tier 2)', () => {
  it('T2.1: should handle 0 questions gracefully without division-by-zero error', () => {
    const result = calculateQuizScore([]);
    assert.equal(result.totalQuestions, 0);
    assert.equal(result.percentage, 0);
    assert.equal(result.masteryLevel, 'Needs Review');
    assert.equal(result.mascotReaction, 'studying');
  });

  it('T2.2: should handle all incorrect answers (0%) with encouraging feedback', () => {
    const answers: UserAnswerRecord[] = [
      { questionId: 'q1', isCorrect: false },
      { questionId: 'q2', isCorrect: false },
      { questionId: 'q3', isCorrect: false }
    ];

    const result = calculateQuizScore(answers);
    assert.equal(result.percentage, 0);
    assert.equal(result.correctAnswers, 0);
    assert.equal(result.masteryLevel, 'Needs Review');
    assert.equal(result.mascotReaction, 'encouraging');
  });

  it('T2.3: should correctly round fractional percentages (e.g., 2/3 = 67%)', () => {
    const answers: UserAnswerRecord[] = [
      { questionId: 'q1', isCorrect: true },
      { questionId: 'q2', isCorrect: true },
      { questionId: 'q3', isCorrect: false }
    ];

    const result = calculateQuizScore(answers);
    assert.equal(result.percentage, 67);
    assert.equal(result.masteryLevel, 'Developing');
  });
});
