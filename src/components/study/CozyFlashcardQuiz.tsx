'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, MoreHorizontal, Lightbulb } from 'lucide-react';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  hint: string;
}

const SAMPLE_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'What is the types question or stombles?',
    options: [
      'Option 1',
      'Option 2',
      'Option 3',
    ],
    correctIndex: 0,
    hint: 'Think about quanta of light (photons) colliding with surface electrons.',
  },
  {
    id: 2,
    question: 'According to de Broglie, what relates matter to wave frequency?',
    options: [
      'Momentum p = h / λ',
      'Energy E = mc³',
      'Velocity v = c / n²',
    ],
    correctIndex: 0,
    hint: 'Matter waves have wavelength inversely proportional to momentum.',
  },
  {
    id: 3,
    question: 'What happens when incident light frequency is below threshold ν₀?',
    options: [
      'No photoelectrons are emitted regardless of intensity',
      'Electrons emit with delay of several minutes',
      'Only thermal electrons evaporate',
    ],
    correctIndex: 0,
    hint: 'Threshold frequency represents minimum energy needed to liberate electrons.',
  },
];

interface CozyFlashcardQuizProps {
  onStartFullQuiz?: () => void;
  isMatcha?: boolean;
}

export default function CozyFlashcardQuiz({
  onStartFullQuiz,
  isMatcha = false,
}: CozyFlashcardQuizProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(0);
  const [showHint, setShowHint] = useState(false);

  const q = SAMPLE_QUESTIONS[currentIdx] || SAMPLE_QUESTIONS[0];
  const progressPercent = ((currentIdx) / SAMPLE_QUESTIONS.length) * 100;

  return (
    <div className="flex flex-col gap-5 h-full w-full">
      {/* Top Card: Question & Progress */}
      <div className={`rounded-[28px] p-6 border transition-all duration-200 shadow-2xl flex flex-col justify-between min-h-[190px] ${
        isMatcha
          ? 'bg-[#18211c] border-[#84a98c]/20'
          : 'bg-[#181412] border-[#29221d]'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-lg select-none text-[#f5efe6]">
            Q
          </span>
          <button
            type="button"
            onClick={onStartFullQuiz}
            className="text-stone-500 hover:text-stone-300 p-1 rounded-md transition-colors"
            title="Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        <div className="my-2">
          <p className="text-[#ded7ce] text-sm font-medium leading-relaxed">
            {q.question}
          </p>
        </div>

        <div className="flex items-center gap-3 mt-4 pt-2">
          <div className="flex-1 bg-[#241e1a] h-1.5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: progressPercent > 0 ? `${progressPercent}%` : '28%' }}
              transition={{ duration: 0.3 }}
              className={`h-full rounded-full ${isMatcha ? 'bg-[#84a98c]' : 'bg-[#d97448]'}`}
            />
          </div>
          <span className="text-xs font-mono text-stone-500 tabular-nums">
            {currentIdx} / {SAMPLE_QUESTIONS.length}
          </span>
        </div>
      </div>

      {/* Bottom Card: Flashcard Options */}
      <div className={`flex-1 rounded-[28px] p-6 border transition-all duration-200 shadow-2xl flex flex-col justify-between min-h-[260px] ${
        isMatcha
          ? 'bg-[#18211c] border-[#84a98c]/20'
          : 'bg-[#181412] border-[#29221d]'
      }`}>
        <div className="flex items-center justify-between pb-3 mb-2">
          <h3 className="text-base font-bold text-[#f5efe6] tracking-tight font-sans">
            Flashcard Quiz
          </h3>
          <button
            type="button"
            onClick={() => setShowHint((h) => !h)}
            className="text-stone-500 hover:text-stone-300 p-1 rounded-md transition-colors"
            title="Hint / Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 flex-1 flex flex-col justify-center">
          {q.options.map((opt, idx) => {
            const isSelected = selectedOption === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSelectedOption(idx);
                  // Cycle to next question after selecting
                  setTimeout(() => {
                    setCurrentIdx((c) => (c + 1) % SAMPLE_QUESTIONS.length);
                  }, 600);
                }}
                className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-left text-xs font-medium transition-all duration-150 border cursor-pointer ${
                  isSelected
                    ? isMatcha
                      ? 'bg-[#84a98c]/15 border-[#84a98c]/60 text-[#f5efe6] shadow-[0_0_12px_rgba(132,169,140,0.15)]'
                      : 'bg-[#271f1a] border-[#523d30] text-[#f5efe6] shadow-[0_0_12px_rgba(224,122,56,0.1)]'
                    : 'bg-[#1b1714] border-[#27211c] text-stone-500 hover:text-stone-300 hover:border-stone-700'
                }`}
              >
                <span className={isSelected ? 'text-[#f5efe6]' : 'text-stone-400'}>{opt}</span>
                {isSelected && (
                  <Check className={`w-4 h-4 stroke-[2.5] ${isMatcha ? 'text-[#84a98c]' : 'text-[#e07a38]'}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Hint popup */}
        <AnimatePresence>
          {showHint && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed overflow-hidden flex items-center gap-1.5"
            >
              <Lightbulb size={14} className="text-amber-400 inline shrink-0" />
              <span>{q.hint}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
