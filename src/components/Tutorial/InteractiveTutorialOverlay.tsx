import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { TUTORIAL_STEPS } from '../../data/campaignData';
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Sparkles,
  X,
} from 'lucide-react';

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const InteractiveTutorialOverlay: React.FC = () => {
  const {
    tutorialState,
    activeTab,
    socialSubTab,
    progressionSubTab,
    setActiveTab,
    nextTutorialStep,
    prevTutorialStep,
    skipTutorial,
    completeTutorial,
  } = useGame();

  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);

  const stepIndex = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, tutorialState.stepIndex));
  const currentStep = TUTORIAL_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TUTORIAL_STEPS.length - 1;

  // Automatically navigate to the current tutorial step's real section
  useEffect(() => {
    if (!tutorialState.isOpen || !currentStep) return;
    const isOnTarget =
      activeTab === currentStep.targetTab ||
      (activeTab === 'progression' &&
        (currentStep.targetTab === 'quests' || currentStep.targetTab === 'achievements') &&
        progressionSubTab === currentStep.targetTab) ||
      (activeTab === 'social' &&
        (currentStep.targetTab === 'leaderboard' ||
          currentStep.targetTab === 'friends' ||
          currentStep.targetTab === 'chat') &&
        socialSubTab === currentStep.targetTab);

    if (!isOnTarget) {
      setActiveTab(currentStep.targetTab);
    }
  }, [tutorialState.isOpen, stepIndex, currentStep, activeTab, progressionSubTab, socialSubTab, setActiveTab]);

  // Measure and scroll target UI element into view with clean spotlight rect
  useEffect(() => {
    if (!tutorialState.isOpen || !currentStep) {
      setHighlightRect(null);
      return;
    }

    let timer = 0;
    let disposed = false;

    const locateElement = (attempt = 0) => {
      if (disposed) return;
      const el = document.querySelector(currentStep.targetSelector) as HTMLElement | null;
      if (!el) {
        if (attempt < 10) {
          timer = window.setTimeout(() => locateElement(attempt + 1), 120);
        } else {
          setHighlightRect(null);
        }
        return;
      }

      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

      const measure = () => {
        if (disposed) return;
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setHighlightRect({
            top: Math.max(8, rect.top - 6),
            left: Math.max(8, rect.left - 6),
            width: Math.min(window.innerWidth - 16, rect.width + 12),
            height: Math.min(window.innerHeight - 16, rect.height + 12),
          });
        }
      };

      timer = window.setTimeout(measure, 240);
    };

    timer = window.setTimeout(() => locateElement(0), 100);

    const onResize = () => locateElement(0);
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('scroll', onResize, { passive: true });

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize);
    };
  }, [tutorialState.isOpen, stepIndex, currentStep, activeTab, progressionSubTab, socialSubTab]);

  if (!tutorialState.isOpen || !currentStep) return null;

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none"
      role="dialog"
      aria-label="Interactive Kingdom Tutorial"
    >
      {/* Target Highlight Ring (non-blocking pointer-events so real UI remains visible & clear) */}
      {highlightRect && (
        <div
          aria-hidden="true"
          className="fixed rounded-2xl border-2 border-[#D6A84B] transition-all duration-300 pointer-events-none"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            boxShadow: '0 0 0 9999px rgba(9, 9, 16, 0.72), 0 0 28px rgba(214, 168, 75, 0.4)',
          }}
        >
          <span className="absolute -top-3 left-4 px-2.5 py-0.5 rounded bg-[#D6A84B] text-[#090910] font-['Cinzel'] font-black text-[10px] uppercase tracking-wider shadow-lg flex items-center gap-1">
            <Compass className="w-3 h-3" />
            Focused Section
          </span>
        </div>
      )}

      {/* Floating Coachmark Dock Card */}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[430px] pointer-events-auto rounded-2xl bg-[#141420]/95 backdrop-blur-xl border-2 border-[#8B5CF6]/70 shadow-[0_24px_64px_rgba(9,9,16,0.9)] p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#D6A84B] font-bold block">
              {currentStep.sectionLabel} · Guided Tour
            </span>
            <h3 className="font-['Cinzel'] font-black text-base sm:text-lg text-[#FFFFFF] mt-0.5">
              {currentStep.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={skipTutorial}
            title="Skip tutorial"
            className="p-1.5 rounded-lg bg-[#0E0E17] hover:bg-[#8B5CF6]/25 border border-[#8B5CF6]/35 text-[#A1A1B8] hover:text-white transition-colors"
            aria-label="Skip tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#A1A1B8] leading-relaxed">
          {currentStep.description}
        </p>

        <div className="p-2.5 rounded-xl bg-[#0E0E17] border border-[#D6A84B]/35 text-[11px] text-[#D6A84B] flex items-start gap-2">
          <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{currentStep.actionTip}</span>
        </div>

        {/* Step Progress Bar */}
        <div className="flex items-center gap-1">
          {TUTORIAL_STEPS.map((st, idx) => (
            <div
              key={st.id}
              className={`h-1 flex-1 rounded-full transition-colors ${
                idx <= stepIndex ? 'bg-gradient-to-r from-[#8B5CF6] to-[#D6A84B]' : 'bg-[#0E0E17]'
              }`}
            />
          ))}
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={skipTutorial}
            className="text-xs text-[#A1A1B8] hover:text-white px-2 py-1.5"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isFirst}
              onClick={prevTutorialStep}
              className="px-3 py-2 rounded-xl bg-[#0E0E17] hover:bg-[#1B1B2B] disabled:opacity-40 border border-[#8B5CF6]/40 text-xs font-semibold text-white flex items-center gap-1 transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            <button
              type="button"
              onClick={isLast ? completeTutorial : nextTutorialStep}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#8B5CF6] to-[#D6A84B] hover:brightness-110 border border-[#D6A84B]/50 text-white font-['Cinzel'] font-black text-xs tracking-wider flex items-center gap-1 shadow-[0_4px_14px_rgba(139,92,246,0.35)] transition-all"
            >
              {isLast ? 'Finish Tour' : 'Next'}
              {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
