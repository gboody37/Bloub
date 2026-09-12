'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  Flag, 
  ChevronRight, 
  RotateCcw, 
  Clock, 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  SkipForward, 
  Calculator,
  HelpCircle,
  Copy,
  Lightbulb,
  Award
} from 'lucide-react';

interface Question {
  id: number;
  questionEn: string;
  questionAr: string;
  topic: string;
  options: {
    id: string;
    en: string;
    ar: string;
  }[];
  correctId: string;
  tawjihiRef: string;
  formula: string;
  explanation: string;
  bloubNote: string;
}

const QUIZ_QUESTIONS: Question[] = [
  {
    id: 1,
    topic: 'Wave-Particle Duality • Photoelectric Effect',
    questionEn: "According to Einstein's photoelectric equation, what occurs if the incident light frequency v is strictly below the cutoff threshold v0?",
    questionAr: 'وفق معادلة أينشتاين الكهروضوئية، ماذا يحدث إذا كان تردد الضوء الساقط أقل تماماً من تردد العتبة v0؟',
    options: [
      {
        id: 'A',
        en: 'No photoelectrons are ejected, regardless of the incident beam intensity.',
        ar: 'لا تنبعث إلكترونات ضوئية على الإطلاق، مهما بلغت شدة الإشعاع الساقط.'
      },
      {
        id: 'B',
        en: 'Photoelectrons are ejected with a delay proportional to intensity.',
        ar: 'تنبعث إلكترونات ضوئية بعد فترة تأخير تتناسب طرداً مع الشدة.'
      },
      {
        id: 'C',
        en: 'Electrons gain kinetic energy without escaping the surface.',
        ar: 'تكتسب الإلكترونات طاقة حركية دون أن تتمكن من مغادرة السطح.'
      },
      {
        id: 'D',
        en: 'The work function Φ decreases linearly with frequency.',
        ar: 'يتناقص اقتران الشغل Φ خطياً بتغير التردد.'
      }
    ],
    correctId: 'A',
    tawjihiRef: 'Tawjihi Ministerial Reference §4.2',
    formula: 'E_k(max) = h(v - v_0) = hv - \\Phi',
    explanation: 'When incident photon frequency is lower than threshold (v < v0), the energy of the individual photon hv is insufficient to overcome the work function Φ = hv0. Because ejection is an instantaneous quantum one-to-one interaction, beam intensity increases only photon quantity, never individual photon energy.',
    bloubNote: 'Nice job! That is a high-yield Tawjihi ministerial exam question. Remember that increasing intensity simply raises the saturation photocurrent, not the kinetic threshold.'
  },
  {
    id: 2,
    topic: 'Stopping Potential • Kinetic Energy',
    questionEn: 'How does doubling the frequency of incident radiation affect the stopping potential (V0) of the photoelectrons?',
    questionAr: 'كيف يؤثر مضاعفة تردد الإشعاع الساقط على جهد الإيقاف (V0) للإلكترونات الضوئية؟',
    options: [
      {
        id: 'A',
        en: 'The stopping potential doubles exactly.',
        ar: 'يتضاعف جهد الإيقاف تماماً.'
      },
      {
        id: 'B',
        en: 'The stopping potential increases to more than double its initial value.',
        ar: 'يزداد جهد الإيقاف لأكثر من الضعف.'
      },
      {
        id: 'C',
        en: 'The stopping potential remains completely unchanged.',
        ar: 'يبقى جهد الإيقاف ثابتاً دون تغيير.'
      },
      {
        id: 'D',
        en: 'The stopping potential drops to zero.',
        ar: 'يهبط جهد الإيقاف إلى الصفر.'
      }
    ],
    correctId: 'B',
    tawjihiRef: 'Tawjihi Ministerial Reference §4.3',
    formula: 'e · V_0 = h v - \\Phi \\implies V_0 = (h/e)v - (\\Phi/e)',
    explanation: 'Since V0 is a linear function with a negative vertical intercept (-Φ/e), doubling the frequency v results in V0 increasing to MORE than double its initial value.',
    bloubNote: 'Common ministerial exam trap! Because of the negative work function constant, it increases more than twofold, not exactly double.'
  },
  {
    id: 3,
    topic: 'de Broglie Hypothesis • Matter Waves',
    questionEn: 'An electron and an alpha particle have identical kinetic energies. Which particle has the longer de Broglie wavelength?',
    questionAr: 'إلكترون وجسيم ألفا يمتلكان نفس الطاقة الحركية. أي الجسيمين يمتلك طول موجة دي برولي أطول؟',
    options: [
      {
        id: 'A',
        en: 'The electron, because wavelength is inversely proportional to the square root of mass.',
        ar: 'الإلكترون، لأن طول الموجة يتناسب عكسياً مع الجذر التربيعي للكتلة.'
      },
      {
        id: 'B',
        en: 'The alpha particle, because its greater mass yields greater momentum.',
        ar: 'جسيم ألفا، لأن كتلته الأكبر تكسبه كمية حركة أكبر.'
      },
      {
        id: 'C',
        en: 'Both particles have identical wavelengths since their kinetic energies are equal.',
        ar: 'كلاهما يمتلكان نفس طول الموجة لتساوي طاقتيهما الحركية.'
      },
      {
        id: 'D',
        en: 'Neither; matter particles cannot propagate as de Broglie waves.',
        ar: 'لا أحد منهما؛ فالجسيمات المادية لا تنتشر كموجات دي برولي.'
      }
    ],
    correctId: 'A',
    tawjihiRef: 'Tawjihi Ministerial Reference §4.5',
    formula: '\\lambda = h / p = h / \\sqrt{2 m E_k}',
    explanation: 'Since λ = h / √(2 m Ek), when Ek is constant, λ is inversely proportional to √m. As the electron has a vastly smaller mass than the alpha particle, its de Broglie wavelength is significantly longer.',
    bloubNote: 'Mastered! de Broglie equations appear in nearly every session of ministerial exam papers.'
  }
];

export default function CozyQuizTab() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({ 1: 'A', 2: 'B' });
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [showExplanation, setShowExplanation] = useState<boolean>(true);
  const [copiedFormula, setCopiedFormula] = useState(false);

  const currentQ = QUIZ_QUESTIONS[currentIndex];
  const selectedOption = selectedAnswers[currentQ.id];

  const handleSelectOption = (optionId: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQ.id]: optionId
    }));
  };

  const handleNext = () => {
    if (currentIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const toggleFlag = () => {
    setFlaggedQuestions(prev => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id]
    }));
  };

  const copyFormulaText = (formula: string) => {
    navigator.clipboard.writeText(formula);
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 2000);
  };

  return (
    <div className="w-full flex-1 flex flex-col gap-4 text-zinc-200 select-none pb-8">
      {/* Top Question Progress Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#121215] border border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono font-medium text-amber-400 uppercase tracking-wider">
            Question {String(currentIndex + 1).padStart(2, '0')} of {String(QUIZ_QUESTIONS.length).padStart(2, '0')}
          </span>
          <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-zinc-600" />
          <span className="text-xs text-zinc-400 truncate max-w-[280px] md:max-w-md">
            {currentQ.topic}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Clock size={12} className="text-amber-500" />
          <span>01:45 remaining</span>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-3 gap-2 px-0.5">
        {QUIZ_QUESTIONS.map((q, idx) => (
          <div 
            key={q.id}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1 rounded-full transition-all cursor-pointer ${
              idx === currentIndex
                ? 'bg-amber-500'
                : selectedAnswers[q.id]
                ? 'bg-zinc-400'
                : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>

      {/* Main Split: Question on Left, Companion on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
        
        {/* Left 8 Cols: Question, Options & Derivation */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Question Card */}
          <div className="p-6 rounded-2xl bg-[#121215] border border-white/[0.07] flex flex-col gap-3 shadow-xl">
            <h2 className="text-lg sm:text-xl font-medium tracking-tight text-white leading-snug">
              {currentQ.questionEn}
            </h2>
            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed text-right font-sans pt-1" dir="rtl">
              {currentQ.questionAr}
            </p>
          </div>

          {/* Options Grid */}
          <div className="flex flex-col gap-2.5">
            {currentQ.options.map(opt => {
              const isSelected = selectedOption === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex items-start gap-3.5 ${
                    isSelected
                      ? 'bg-amber-500/[0.06] border-amber-500/80 ring-1 ring-amber-500/40 text-white shadow-sm'
                      : 'bg-[#121215] hover:bg-[#18181d] border-white/[0.06] text-zinc-300'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                    isSelected 
                      ? 'bg-amber-500 text-zinc-950 font-bold' 
                      : 'bg-white/[0.04] border border-white/[0.08] text-zinc-400 group-hover:text-zinc-200'
                  }`}>
                    {isSelected ? <Check size={12} strokeWidth={3} /> : opt.id}
                  </div>

                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold tracking-wide uppercase text-zinc-400">
                        Option {opt.id}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-medium tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-zinc-100 leading-relaxed">
                      {opt.en}
                    </p>
                    <p className="text-sm text-zinc-400 text-right font-sans leading-relaxed pt-0.5" dir="rtl">
                      {opt.ar}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation & Derivation Card */}
          {showExplanation && (
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-xl bg-[#121215] border border-white/[0.07] flex flex-col gap-3"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
                  <Lightbulb size={13} className="text-amber-500" />
                  <span>Explanation & Concept Derivation</span>
                </div>
                <span className="text-[11px] font-mono text-zinc-500">
                  {currentQ.tawjihiRef}
                </span>
              </div>

              {/* Formula Highlight */}
              <div className="p-3 rounded-lg bg-[#0c0c0e] border border-white/[0.06] flex items-center justify-between font-mono text-xs text-amber-300">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">
                    Einstein's Photoelectric Formula
                  </span>
                  <span className="font-semibold">{currentQ.formula}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyFormulaText(currentQ.formula)}
                  className="p-1 rounded hover:bg-white/[0.06] text-zinc-400 hover:text-white transition-colors"
                  title="Copy formula"
                >
                  {copiedFormula ? <Check size={12} className="text-amber-400" /> : <Copy size={12} />}
                </button>
              </div>

              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                {currentQ.explanation}
              </p>

              {/* Bloub's Memory Tip */}
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed">
                <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
                  <Sparkles size={11} />
                </div>
                <div>
                  <strong className="text-amber-400">Bloub's Note: </strong>
                  {currentQ.bloubNote}
                </div>
              </div>
            </motion.div>
          )}

        </div>

        {/* Right 4 Cols: Navigator, Formula Card & Actions */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Question Navigator Box */}
          <div className="p-4 rounded-xl bg-[#121215] border border-white/[0.07] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <BookOpen size={12} className="text-zinc-400" />
                Question Navigator
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                {Object.keys(selectedAnswers).length} / {QUIZ_QUESTIONS.length}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {QUIZ_QUESTIONS.map((q, idx) => {
                const isActive = idx === currentIndex;
                const isAnswered = selectedAnswers[q.id] !== undefined;
                const isFlagged = flaggedQuestions[q.id];

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all border ${
                      isActive
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-semibold'
                        : isAnswered
                        ? 'bg-white/[0.06] border-white/[0.1] text-zinc-200'
                        : 'bg-[#16161a] border-white/[0.06] text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <span>Q{q.id}</span>
                    {isFlagged ? (
                      <Flag size={8} className="text-amber-400 fill-amber-400" />
                    ) : isAnswered ? (
                      <Check size={8} className="text-zinc-300" />
                    ) : (
                      <span className="w-1 h-1 rounded-full bg-zinc-700" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-white/[0.06]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" /> Answered
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Current
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" /> Pending
              </span>
            </div>
          </div>

          {/* Formula Companion Card */}
          <div className="p-4 rounded-xl bg-[#121215] border border-white/[0.07] flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Calculator size={12} className="text-zinc-400" />
                Formula Reference
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                Chapter 4
              </span>
            </div>

            <div className="flex flex-col gap-2 font-mono text-xs">
              <div className="p-2 rounded-lg bg-[#0c0c0e] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-zinc-200 font-medium block">E = h·v = hc / λ</span>
                  <span className="text-[10px] text-zinc-500 font-sans">Photon Energy</span>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-[#0c0c0e] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-zinc-200 font-medium block">Φ = h·v0 = hc / λ0</span>
                  <span className="text-[10px] text-zinc-500 font-sans">Work Function</span>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-[#0c0c0e] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-zinc-200 font-medium block">e·V0 = Ek(max)</span>
                  <span className="text-[10px] text-zinc-500 font-sans">Stopping Potential</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={handleNext}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-zinc-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>{currentIndex === QUIZ_QUESTIONS.length - 1 ? 'Finish Quiz Session' : 'Next Question →'}</span>
              <ChevronRight size={14} />
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={toggleFlag}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  flaggedQuestions[currentQ.id]
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-[#181412] hover:bg-[#221b17] border-[#2b221b] text-stone-400 hover:text-stone-200'
                }`}
              >
                <Flag size={12} className={flaggedQuestions[currentQ.id] ? 'fill-amber-400' : ''} />
                <span>Flag</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="py-2 px-3 rounded-xl bg-[#181412] hover:bg-[#221b17] border border-[#2b221b] text-stone-400 hover:text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <SkipForward size={12} />
                <span>Skip</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}