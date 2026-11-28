import React, { useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import {
  DAILY_ATTRIBUTE_XP_CAPS,
  MAX_SKILL_ATTRIBUTE_LEVEL,
  SKILL_LEVEL_XP_THRESHOLDS,
  SKILL_TREE_ATTRIBUTES,
  evaluateSkillNodeStatus,
  getSkillAttributeById,
} from '../../data/skillTreeData';
import { SkillAttributeId, SkillNodeDefinition } from '../../types/game';
import { GoldenWorldTreeEmblem } from '../Brand/GoldenWorldTreeEmblem';
import { FeatureBanner } from '../Theme/FeatureThemePrimitives';
import {
  AnimatedCounter,
  AnimatedProgressBar,
  RpgModalWrapper,
} from '../Motion/RpgMotionPrimitives';
import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  Compass,
  Dumbbell,
  Flame,
  HeartPulse,
  Lock,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  X,
} from 'lucide-react';

const ATTRIBUTE_ICONS: Record<SkillAttributeId, React.ComponentType<{ className?: string }>> = {
  strength: Dumbbell,
  endurance: WindIcon,
  discipline: Target,
  focus: BookOpen,
  resilience: Flame,
  vitality: HeartPulse,
};

function WindIcon({ className }: { className?: string }) {
  return <Activity className={className} />;
}

export const SkillTreeView: React.FC = () => {
  const {
    skillTreeState,
    skillTreeLoading,
    lastSkillAwardBanner,
    dismissSkillAwardBanner,
    unlockSkillNode,
    claimSkillMilestone,
    logVerifiedStudySession,
    reconcileSkillTree,
    setActiveTab,
  } = useGame();

  const [selectedAttributeId, setSelectedAttributeId] = useState<SkillAttributeId>('strength');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('str-1a');
  const [chartWindow, setChartWindow] = useState<'7d' | '30d'>('7d');
  const [reconciling, setReconciling] = useState(false);
  const [reconcileNotice, setReconcileNotice] = useState<string | null>(null);
  const [unlockFeedback, setUnlockFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isMutating, setIsMutating] = useState<boolean>(false);
  const [justUnlockedNodeId, setJustUnlockedNodeId] = useState<string | null>(null);

  // Verified Study Session Form State
  const [showStudyModal, setShowStudyModal] = useState<boolean>(false);
  const [studyTopic, setStudyTopic] = useState<string>('');
  const [studyMinutes, setStudyMinutes] = useState<number>(30);
  const [studyReflection, setStudyReflection] = useState<string>('');
  const [studyStatusMsg, setStudyStatusMsg] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isSubmittingStudy, setIsSubmittingStudy] = useState<boolean>(false);

  const activeAttrDef = useMemo(
    () => getSkillAttributeById(selectedAttributeId),
    [selectedAttributeId]
  );
  const activeAttrProgress = skillTreeState.attributes[selectedAttributeId];

  const handleSelectAttribute = (attrId: SkillAttributeId) => {
    const def = getSkillAttributeById(attrId);
    setSelectedAttributeId(attrId);
    setSelectedNodeId(def.nodes[0]?.id || 'str-1a');
    setUnlockFeedback(null);
  };

  const selectedNode: SkillNodeDefinition = useMemo(() => {
    return (
      activeAttrDef.nodes.find(n => n.id === selectedNodeId) ||
      activeAttrDef.nodes[0]
    );
  }, [activeAttrDef, selectedNodeId]);

  const selectedNodeEval = useMemo(
    () =>
      evaluateSkillNodeStatus(
        selectedNode,
        activeAttrProgress,
        skillTreeState.unlockedNodeIds
      ),
    [selectedNode, activeAttrProgress, skillTreeState.unlockedNodeIds]
  );

  // Totals across all 6 attributes
  const totalUnlockedNodes = skillTreeState.unlockedNodeIds.length;
  const totalAvailableNodes = useMemo(() => {
    let count = 0;
    for (const attr of SKILL_TREE_ATTRIBUTES) {
      const prog = skillTreeState.attributes[attr.id];
      for (const n of attr.nodes) {
        if (evaluateSkillNodeStatus(n, prog, skillTreeState.unlockedNodeIds).status === 'available') {
          count += 1;
        }
      }
    }
    return count;
  }, [skillTreeState]);

  const handleUnlockNode = async (node: SkillNodeDefinition) => {
    if (isMutating) return;
    setIsMutating(true);
    setUnlockFeedback(null);
    try {
      const res = await unlockSkillNode(node.id);
      if (res.success) {
        setJustUnlockedNodeId(node.id);
        setUnlockFeedback({
          type: 'success',
          message: `Unlocked "${node.name}" — Mastery Title earned: ${node.masteryTitle}.`,
        });
        window.setTimeout(() => setJustUnlockedNodeId(null), 1600);
      } else {
        setUnlockFeedback({
          type: 'error',
          message: res.error || 'Requirements not yet met to unlock this skill.',
        });
      }
    } finally {
      setIsMutating(false);
    }
  };

  const handleClaimMilestone = async (milestoneId: string, title: string) => {
    if (isMutating) return;
    setIsMutating(true);
    setUnlockFeedback(null);
    try {
      const res = await claimSkillMilestone(milestoneId);
      if (res.success) {
        setUnlockFeedback({
          type: 'success',
          message: `Claimed Milestone Seal: "${title}".`,
        });
      } else {
        setUnlockFeedback({
          type: 'error',
          message: res.error || 'Milestone requirements not yet met.',
        });
      }
    } finally {
      setIsMutating(false);
    }
  };

  const handleSubmitStudySession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingStudy) return;
    setIsSubmittingStudy(true);
    setStudyStatusMsg(null);
    try {
      const res = await logVerifiedStudySession({
        topic: studyTopic,
        durationMinutes: studyMinutes,
        reflection: studyReflection,
      });
      if (res.success) {
        setStudyStatusMsg({
          type: 'success',
          message: res.safetyCapped
            ? `Study session recorded (+${res.xpAwarded} Focus XP — daily healthy cap reached).`
            : `Study session verified (+${res.xpAwarded} Focus XP awarded).`,
        });
        setStudyTopic('');
        setStudyReflection('');
        setSelectedAttributeId('focus');
        setSelectedNodeId('foc-1a');
      } else {
        setStudyStatusMsg({
          type: 'error',
          message: res.error || 'Could not verify study session.',
        });
      }
    } finally {
      setIsSubmittingStudy(false);
    }
  };

  const attrUnlockedCount = activeAttrDef.nodes.filter(n =>
    skillTreeState.unlockedNodeIds.includes(n.id)
  ).length;
  const dailyCap = DAILY_ATTRIBUTE_XP_CAPS[selectedAttributeId];
  const nextLevelThreshold =
    activeAttrProgress.level >= MAX_SKILL_ATTRIBUTE_LEVEL
      ? SKILL_LEVEL_XP_THRESHOLDS[MAX_SKILL_ATTRIBUTE_LEVEL - 1]
      : SKILL_LEVEL_XP_THRESHOLDS[activeAttrProgress.level];

  const computedTotalXp = useMemo(
    () =>
      SKILL_TREE_ATTRIBUTES.reduce(
        (sum, attr) => sum + (skillTreeState.attributes[attr.id]?.xp || 0),
        0
      ),
    [skillTreeState.attributes]
  );

  const computedTotalActivities = useMemo(
    () =>
      SKILL_TREE_ATTRIBUTES.reduce(
        (sum, attr) => sum + (skillTreeState.attributes[attr.id]?.totalActivities || 0),
        0
      ),
    [skillTreeState.attributes]
  );

  const totalXpDisplay = skillTreeState.analytics?.totalSkillXp ?? computedTotalXp;
  const totalActivitiesDisplay =
    skillTreeState.analytics?.totalActivities ?? computedTotalActivities;

  const dailySeries = useMemo(() => {
    const raw =
      chartWindow === '7d'
        ? skillTreeState.analytics?.dailySeries7d
        : skillTreeState.analytics?.dailySeries30d;
    return raw && raw.length > 0 ? raw : [];
  }, [chartWindow, skillTreeState.analytics]);

  const handleSyncHistory = async () => {
    if (reconciling) return;
    setReconciling(true);
    setReconcileNotice(null);
    try {
      const res = await reconcileSkillTree();
      if (res.ok) {
        setReconcileNotice(
          res.reconciledCount && res.reconciledCount > 0
            ? `Synced ${res.reconciledCount} newly reconciled activities into your Skill Tree.`
            : 'All verified workouts, meals, habits, and reflections are 100% synced.'
        );
      } else {
        setReconcileNotice('Could not complete skill tree synchronization right now.');
      }
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Banner Header with World Tree Emblem */}
      <FeatureBanner themeId="skill-tree">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#061225] border border-[#F59E0B]/45 flex items-center justify-center shrink-0 shadow-[0_0_18px_rgba(245,158,11,0.2)]">
              <GoldenWorldTreeEmblem className="w-11 h-11" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#94A8C7]">
                <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#10B981]">
                  Real-Life Skill Tree
                </span>
                <span className="text-[#647A9E]" aria-hidden="true">·</span>
                <span className="tabular-nums font-mono">
                  <AnimatedCounter value={totalXpDisplay} /> Attribute XP
                </span>
                <span className="text-[#647A9E]" aria-hidden="true">·</span>
                <span className="tabular-nums font-mono">
                  <AnimatedCounter value={totalActivitiesDisplay} /> Verified Activities
                </span>
                <span className="text-[#647A9E]" aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {totalUnlockedNodes} / 54 Skills Unlocked
                </span>
                <span className="text-[#647A9E]" aria-hidden="true">·</span>
                <span className="tabular-nums text-[#38D9F5] font-semibold">
                  {totalAvailableNodes} Ready
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black font-['Cinzel'] tracking-wide text-[#F2F7FF] mt-1 text-balance">
                ATTRIBUTES OF AETHERIA
              </h1>
              <p className="text-xs sm:text-sm text-[#94A8C7] max-w-2xl mt-1 leading-relaxed">
                Grow six real-life virtues through verified workouts, daily habits, deep study, comeback streaks, and recovery. Attribute XP advances independently from Player XP.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={reconciling || skillTreeLoading}
              onClick={() => void handleSyncHistory()}
              className="lq-btn lq-btn-secondary px-3.5 py-2 text-xs whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#10B981] ${reconciling ? 'animate-spin' : ''}`} />
              {reconciling ? 'Syncing...' : 'Sync Verified History'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStudyStatusMsg(null);
                setShowStudyModal(true);
              }}
              className="lq-btn lq-btn-secondary px-3.5 py-2 text-xs whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#38D9F5]" />
              Log Verified Study
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('fitness')}
              className="lq-btn lq-btn-primary px-3.5 py-2 text-xs font-bold whitespace-nowrap shrink-0"
            >
              <Compass className="w-3.5 h-3.5" />
              Log Training
            </button>
          </div>
        </div>
        {reconcileNotice && (
          <div className="mt-4 pt-3 border-t border-[#1E3A63] text-xs text-[#10B981] flex items-center justify-between gap-2">
            <span>{reconcileNotice}</span>
            <button
              type="button"
              onClick={() => setReconcileNotice(null)}
              className="text-[#10B981]/75 hover:text-[#F2F7FF] cursor-pointer"
              aria-label="Dismiss sync notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </FeatureBanner>

      {/* Synchronized Skill Tree Analytics (Daily Activity + 6-Attribute Balance) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 rounded-2xl bg-[#0A1930] border border-[#1E3A63] shadow-[0_14px_34px_-14px_rgba(3,10,24,0.85)] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-['Cinzel'] font-bold text-sm uppercase tracking-wider text-[#F2F7FF] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#10B981]" />
                Verified Attribute XP History
              </h2>
              <p className="text-[11px] text-[#94A8C7] mt-0.5 tabular-nums">
                1:1 Ledger Output · {totalXpDisplay.toLocaleString()} Total XP across {totalActivitiesDisplay} verified activities
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-[#061225] rounded-lg border border-[#1E3A63]">
              {(['7d', '30d'] as const).map(win => (
                <button
                  key={win}
                  type="button"
                  onClick={() => setChartWindow(win)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold uppercase transition-colors cursor-pointer ${
                    chartWindow === win
                      ? 'bg-[#1677FF] text-[#F2F7FF]'
                      : 'text-[#94A8C7] hover:text-[#F2F7FF]'
                  }`}
                >
                  {win}
                </button>
              ))}
            </div>
          </div>

          {dailySeries.length === 0 ? (
            <div className="h-36 flex items-center justify-center text-xs text-[#94A8C7]">
              Complete workouts, habits, hydration, or verified study to plot daily progression.
            </div>
          ) : (
            (() => {
              const maxDayXp = Math.max(10, ...dailySeries.map(d => d.totalXp));
              return (
                <div className="space-y-2">
                  <div className="h-36 flex items-end gap-1 pt-2">
                    {dailySeries.map(pt => {
                      const heightPct = Math.max(4, Math.round((pt.totalXp / maxDayXp) * 100));
                      return (
                        <div
                          key={pt.date}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative"
                          title={`${pt.date}: ${pt.totalXp} XP (${pt.activitiesCount} activities)`}
                        >
                          <div
                            className={`w-full rounded-t transition-all ${
                              pt.totalXp > 0
                                ? 'bg-gradient-to-t from-[#1677FF] via-[#00D9FF] to-[#38D9F5] group-hover:brightness-110'
                                : 'bg-[#102440]'
                            }`}
                            style={{ height: `${pt.totalXp > 0 ? heightPct : 3}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#94A8C7] tabular-nums">
                    <span>{dailySeries[0]?.date.slice(5)}</span>
                    <span>
                      Period Total:{' '}
                      {dailySeries.reduce((s, d) => s + d.totalXp, 0).toLocaleString()} XP ·{' '}
                      {dailySeries.reduce((s, d) => s + d.activitiesCount, 0)} Activities
                    </span>
                    <span>{dailySeries[dailySeries.length - 1]?.date.slice(5)}</span>
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* 6-Attribute SVG Balance Radar */}
        <div className="lg:col-span-5 rounded-2xl bg-[#0A1930] border border-[#1E3A63] shadow-[0_14px_34px_-14px_rgba(3,10,24,0.85)] p-5 flex flex-col justify-between gap-3">
          <div>
            <h2 className="font-['Cinzel'] font-bold text-sm uppercase tracking-wider text-[#F2F7FF]">
              Virtue Balance Radar
            </h2>
            <p className="text-[11px] text-[#94A8C7] mt-0.5">
              Proportional attribute levels (1–10 scale) synchronized directly from attribute state.
            </p>
          </div>

          <div className="flex items-center gap-4">
            {(() => {
              const cx = 85;
              const cy = 85;
              const radius = 60;
              const attrs = SKILL_TREE_ATTRIBUTES;
              const pointsForLevel = (valRatio: number, idx: number) => {
                const angle = (Math.PI * 2 * idx) / attrs.length - Math.PI / 2;
                return {
                  x: cx + Math.cos(angle) * radius * valRatio,
                  y: cy + Math.sin(angle) * radius * valRatio,
                };
              };
              const polygonPoints = attrs
                .map((attr, idx) => {
                  const prog = skillTreeState.attributes[attr.id];
                  const ratio = Math.max(0.15, Math.min(1, prog.level / MAX_SKILL_ATTRIBUTE_LEVEL));
                  const pt = pointsForLevel(ratio, idx);
                  return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
                })
                .join(' ');

              return (
                <svg viewBox="0 0 170 170" className="w-36 h-36 shrink-0" aria-label="Six attributes radar chart">
                  {[0.33, 0.66, 1].map(ring => (
                    <polygon
                      key={ring}
                      points={attrs
                        .map((_, idx) => {
                          const pt = pointsForLevel(ring, idx);
                          return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="rgba(22, 119, 255, 0.38)"
                      strokeWidth="1"
                    />
                  ))}
                  {attrs.map((_, idx) => {
                    const pt = pointsForLevel(1, idx);
                    return (
                      <line
                        key={idx}
                        x1={cx}
                        y1={cy}
                        x2={pt.x}
                        y2={pt.y}
                        stroke="rgba(148, 168, 199, 0.2)"
                        strokeWidth="1"
                      />
                    );
                  })}
                  <polygon
                    points={polygonPoints}
                    fill="rgba(22, 119, 255, 0.34)"
                    stroke="#00D9FF"
                    strokeWidth="1.8"
                  />
                </svg>
              );
            })()}

            <div className="flex-1 space-y-1.5 text-xs">
              {SKILL_TREE_ATTRIBUTES.map(attr => {
                const prog = skillTreeState.attributes[attr.id];
                const share =
                  skillTreeState.analytics?.attributeDistribution?.[attr.id]?.percent ??
                  (computedTotalXp > 0 ? Math.round((prog.xp / computedTotalXp) * 100) : 0);
                return (
                  <div key={attr.id} className="flex items-center justify-between gap-2 tabular-nums">
                    <span className="font-semibold text-[#94A8C7] truncate" style={{ color: attr.accentHex }}>
                      {attr.name}
                    </span>
                    <span className="font-mono text-[#F2F7FF]">
                      Lv.{prog.level} · {prog.xp} XP ({share}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Live Verified XP Award Toast / Banner */}
      {lastSkillAwardBanner && !lastSkillAwardBanner.duplicate && (
        <div className="rounded-xl bg-[#102440] border border-[#00D9FF]/55 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles className="w-4 h-4 text-[#38D9F5] shrink-0" />
            <p className="text-xs sm:text-sm text-[#F2F7FF]">
              <strong className="font-['Cinzel'] text-[#38D9F5] uppercase tracking-wider">
                +{lastSkillAwardBanner.xpAwarded} {lastSkillAwardBanner.attributeId} XP
              </strong>
              {lastSkillAwardBanner.leveledUp && (
                <span className="ml-2 text-[#10B981] font-semibold">
                  · Level Up! Now Level {lastSkillAwardBanner.newLevel}
                </span>
              )}
              {lastSkillAwardBanner.safetyCapped && (
                <span className="ml-2 text-[#94A8C7] text-xs">
                  · Healthy daily safety cap applied
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={dismissSkillAwardBanner}
            aria-label="Dismiss notification"
            className="p-1 rounded-lg text-[#94A8C7] hover:text-[#F2F7FF] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 6 Core Attributes Selector Grid */}
      <div
        role="tablist"
        aria-label="Six Core Attributes"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        {SKILL_TREE_ATTRIBUTES.map(attr => {
          const Icon = ATTRIBUTE_ICONS[attr.id];
          const prog = skillTreeState.attributes[attr.id];
          const isSelected = attr.id === selectedAttributeId;
          const unlockedInAttr = attr.nodes.filter(n =>
            skillTreeState.unlockedNodeIds.includes(n.id)
          ).length;
          const availableInAttr = attr.nodes.filter(
            n =>
              evaluateSkillNodeStatus(n, prog, skillTreeState.unlockedNodeIds).status ===
              'available'
          ).length;

          return (
            <button
              key={attr.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => handleSelectAttribute(attr.id)}
              className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#102440] border-[#00D9FF]/70 shadow-[0_0_20px_rgba(22,119,255,0.28)]'
                  : 'bg-[#0A1930] border-[#1E3A63] hover:border-[#1677FF]/70 hover:bg-[#102440]/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#061225] border border-[#1E3A63]"
                  style={{ color: attr.accentHex }}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="font-mono text-xs font-bold text-[#F2F7FF] tabular-nums">
                  Lv.{prog.level}/10
                </span>
              </div>

              <div className="font-['Cinzel'] font-bold text-xs sm:text-sm text-[#F2F7FF] truncate">
                {attr.name}
              </div>

              <div className="w-full h-1.5 rounded-full bg-[#061225] overflow-hidden mt-2 mb-1.5">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${prog.progressPercent}%`,
                    backgroundColor: attr.accentHex,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#94A8C7] tabular-nums">
                <span>{unlockedInAttr}/9 Nodes</span>
                {availableInAttr > 0 ? (
                  <span className="text-[#38D9F5] font-bold">
                    {availableInAttr} Ready
                  </span>
                ) : (
                  <span>{prog.xp} XP</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Attribute Progress & Main Tree + Inspector Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left/Main Column: Attribute Overview + 3 Interactive Skill Branches */}
        <div className="xl:col-span-8 space-y-5">
          {/* Active Attribute Progress Header */}
          <div className="rounded-2xl bg-[#0A1930] border border-[#1E3A63] shadow-[0_14px_34px_-14px_rgba(3,10,24,0.85)] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#94A8C7]">
                  <span
                    className="font-['Cinzel'] font-bold uppercase tracking-wider"
                    style={{ color: activeAttrDef.accentHex }}
                  >
                    {activeAttrDef.name} Mastery
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {activeAttrProgress.totalActivities} Verified Activities
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {attrUnlockedCount}/9 Skills
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-['Cinzel'] font-bold text-[#F2F7FF] mt-0.5">
                  {activeAttrDef.subtitle}
                </h2>
                <p className="text-xs text-[#94A8C7] mt-1 max-w-2xl">
                  {activeAttrDef.description}
                </p>
              </div>

              <div className="sm:text-right shrink-0">
                <div className="font-mono text-2xl font-black text-[#F2F7FF] tabular-nums">
                  Level {activeAttrProgress.level}{' '}
                  <span className="text-sm font-normal text-[#647A9E]">/ 10</span>
                </div>
                <div className="text-[11px] font-mono text-[#38D9F5] tabular-nums">
                  {activeAttrProgress.level >= MAX_SKILL_ATTRIBUTE_LEVEL
                    ? `${activeAttrProgress.xp} XP · Max Level Reached`
                    : `${activeAttrProgress.xpIntoCurrentLevel} / ${activeAttrProgress.xpForNextLevel} XP to Lv.${
                        activeAttrProgress.level + 1
                      } (${nextLevelThreshold} total)`}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <AnimatedProgressBar
                percentage={activeAttrProgress.progressPercent}
                className="w-full h-2.5 rounded-full bg-[#061225] border border-[#1E3A63] overflow-hidden"
                barClassName="bg-[#1677FF]"
                barStyle={{ backgroundColor: activeAttrDef.accentHex }}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-[11px] text-[#94A8C7] tabular-nums">
                <span>
                  Verified Sources: {activeAttrDef.verifiedSources.join(' · ')}
                </span>
                <span>
                  Daily Healthy Cap: {activeAttrProgress.dailyXpEarned} / {dailyCap} XP
                </span>
              </div>
            </div>
          </div>

          {/* Interactive 3-Branch Skill Tree Canvas with SVG Connectors */}
          <div className="rounded-2xl bg-[#0A1930] border border-[#1E3A63] p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-['Cinzel'] font-bold text-sm uppercase tracking-widest text-[#38D9F5]">
                Three Skill Branches
              </h3>
              <span className="text-[11px] text-[#94A8C7]">
                Select any node to inspect requirements or unlock
              </span>
            </div>

            {/* Root Canopy Connector SVG on Desktop */}
            <div className="hidden md:block w-full h-8 -mb-1" aria-hidden="true">
              <svg viewBox="0 0 600 40" className="w-full h-full" preserveAspectRatio="none">
                <circle cx="300" cy="6" r="4" fill="#00D9FF" />
                <path
                  d="M300 6 C300 22, 100 18, 100 38"
                  stroke={activeAttrDef.accentHex}
                  strokeOpacity="0.45"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M300 6 L300 38"
                  stroke={activeAttrDef.accentHex}
                  strokeOpacity="0.45"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M300 6 C300 22, 500 18, 500 38"
                  stroke={activeAttrDef.accentHex}
                  strokeOpacity="0.45"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {activeAttrDef.branches.map(branch => {
                const branchNodes = activeAttrDef.nodes
                  .filter(n => n.branchId === branch.id)
                  .sort((a, b) => a.tier - b.tier);

                return (
                  <div
                    key={branch.id}
                    className="rounded-xl bg-[#061225] border border-[#1E3A63] p-4 flex flex-col"
                  >
                    <div className="text-center pb-3 mb-3 border-b border-[#1E3A63]">
                      <h4 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF]">
                        {branch.name}
                      </h4>
                      <p className="text-[11px] text-[#94A8C7] mt-0.5">
                        {branch.subtitle}
                      </p>
                    </div>

                    <div className="flex flex-col items-center">
                      {branchNodes.map((node, idx) => {
                        const evalResult = evaluateSkillNodeStatus(
                          node,
                          activeAttrProgress,
                          skillTreeState.unlockedNodeIds
                        );
                        const isSelected = selectedNode.id === node.id;
                        const isUnlocked = evalResult.status === 'unlocked';
                        const isAvailable = evalResult.status === 'available';
                        const isJustUnlocked = justUnlockedNodeId === node.id;

                        const prevNode = idx > 0 ? branchNodes[idx - 1] : null;
                        const prevUnlocked = prevNode
                          ? skillTreeState.unlockedNodeIds.includes(prevNode.id)
                          : false;

                        return (
                          <React.Fragment key={node.id}>
                            {idx > 0 && (
                              <div className="w-8 h-8 flex items-center justify-center" aria-hidden="true">
                                <svg viewBox="0 0 24 32" className="w-6 h-8">
                                  <line
                                    x1="12"
                                    y1="0"
                                    x2="12"
                                    y2="32"
                                    stroke={
                                      isUnlocked
                                        ? '#10B981'
                                        : prevUnlocked
                                        ? '#00D9FF'
                                        : 'rgba(148, 168, 199, 0.25)'
                                    }
                                    strokeWidth={isUnlocked ? '2.5' : prevUnlocked ? '2' : '1.5'}
                                    strokeDasharray={isUnlocked || prevUnlocked ? undefined : '4 3'}
                                  />
                                  <circle
                                    cx="12"
                                    cy="16"
                                    r="3"
                                      fill={
                                        isUnlocked
                                          ? '#10B981'
                                          : isAvailable
                                          ? '#00D9FF'
                                          : '#0A1930'
                                      }
                                      stroke={
                                        isUnlocked
                                          ? '#10B981'
                                          : isAvailable
                                          ? '#00D9FF'
                                          : 'rgba(148, 168, 199, 0.28)'
                                      }
                                      strokeWidth="1"
                                    />
                                  </svg>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedNodeId(node.id);
                                  setUnlockFeedback(null);
                                }}
                                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 cursor-pointer ${
                                  isJustUnlocked
                                    ? 'ring-2 ring-[#00D9FF] scale-[1.02] motion-reduce:scale-100'
                                    : ''
                                } ${
                                  isUnlocked
                                    ? 'bg-gradient-to-br from-[#102440] to-[#0A2628] border-[#10B981]/70 text-[#F2F7FF] shadow-[0_0_18px_rgba(16,185,129,0.18)]'
                                    : isAvailable
                                    ? 'bg-[#102440] border-[#00D9FF] text-[#F2F7FF] shadow-[0_0_16px_rgba(0,217,255,0.22)]'
                                    : 'bg-[#0A1930]/90 border-[#1E3A63] text-[#94A8C7] opacity-80 hover:opacity-100 hover:border-[#1677FF]/65'
                                } ${isSelected ? 'ring-2 ring-[#1677FF]' : ''}`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#94A8C7] tabular-nums">
                                    Tier {node.tier} · Lv.{node.requirements.minAttributeLevel}
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                                      isUnlocked
                                        ? 'text-[#10B981]'
                                        : isAvailable
                                        ? 'text-[#38D9F5]'
                                      : 'text-[#647A9E]'
                                  }`}
                                >
                                  {isUnlocked ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                      Unlocked
                                    </>
                                  ) : isAvailable ? (
                                    <>
                                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                      Ready to Unlock
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="w-3 h-3 shrink-0" />
                                      Locked
                                    </>
                                  )}
                                </span>
                              </div>
                              <div className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF]">
                                {node.name}
                              </div>
                              <div className="text-[11px] text-[#94A8C7] mt-0.5 line-clamp-2">
                                {node.tagline}
                              </div>
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Attribute Milestones Track */}
          <div className="rounded-2xl bg-[#0A1930] border border-[#1E3A63] shadow-[0_14px_34px_-14px_rgba(3,10,24,0.85)] p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-['Cinzel'] font-bold text-sm uppercase tracking-wider text-[#F2F7FF] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#FBBF24]" />
                {activeAttrDef.name} Milestones
              </h3>
              <span className="text-[11px] text-[#94A8C7]">
                Recognition seals earned strictly through attribute mastery
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeAttrDef.milestones.map(ms => {
                const isClaimed = skillTreeState.claimedMilestoneIds.includes(ms.id);
                const levelMet = activeAttrProgress.level >= ms.requiredLevel;
                const nodesMet =
                  !ms.requiredNodesUnlocked ||
                  attrUnlockedCount >= ms.requiredNodesUnlocked;
                const canClaim = !isClaimed && levelMet && nodesMet;

                return (
                  <div
                    key={ms.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
                      isClaimed
                        ? 'bg-[#10B981]/10 border-[#10B981]/45'
                        : canClaim
                        ? 'bg-[#102440] border-[#F59E0B]/70 shadow-[0_0_16px_rgba(245,158,11,0.18)]'
                        : 'bg-[#061225] border-[#1E3A63]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                        <span className="text-[#10B981] font-bold">
                          Lv.{ms.requiredLevel}
                          {ms.requiredNodesUnlocked
                            ? ` · ${ms.requiredNodesUnlocked} Nodes`
                            : ''}
                        </span>
                        <span className="text-[#FBBF24]">{ms.honorSeal}</span>
                      </div>
                      <h4 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF] mt-1">
                        {ms.title}
                      </h4>
                      <p className="text-xs text-[#94A8C7] mt-0.5">
                        {ms.description}
                      </p>
                    </div>

                    <div>
                      {isClaimed ? (
                        <div className="text-[11px] font-semibold text-[#10B981] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Seal Claimed
                        </div>
                      ) : canClaim ? (
                        <button
                          type="button"
                          disabled={isMutating}
                          onClick={() => void handleClaimMilestone(ms.id, ms.title)}
                          className="lq-btn lq-btn-gold w-full py-1.5 px-3 font-['Cinzel'] font-bold text-xs tracking-wider uppercase"
                        >
                          Claim Seal
                        </button>
                      ) : (
                        <div className="text-[11px] text-[#647A9E] flex items-center gap-1.5">
                          <Lock className="w-3 h-3" />
                          Locked · Reach Lv.{ms.requiredLevel}
                          {ms.requiredNodesUnlocked
                            ? ` & ${ms.requiredNodesUnlocked} skills`
                            : ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Skill Inspector + Recent Verified Ledger */}
        <div className="xl:col-span-4 space-y-5 xl:sticky xl:top-24">
          {/* Selected Node Detail Card */}
          <div className="rounded-2xl bg-[#0A1930] border border-[#1E3A63] shadow-[0_14px_34px_-14px_rgba(3,10,24,0.85)] p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#38D9F5]">
                  {selectedNode.branchName} · Tier {selectedNode.tier}
                </div>
                <h3 className="font-['Cinzel'] font-bold text-xl text-[#F2F7FF] mt-0.5">
                  {selectedNode.name}
                </h3>
                <p className="text-xs italic text-[#94A8C7] mt-0.5">
                  &ldquo;{selectedNode.tagline}&rdquo;
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                  selectedNodeEval.status === 'unlocked'
                    ? 'bg-[#10B981]/12 text-[#10B981] border-[#10B981]/45'
                    : selectedNodeEval.status === 'available'
                    ? 'bg-[#00D9FF]/12 text-[#38D9F5] border-[#00D9FF]'
                    : 'bg-[#061225] text-[#647A9E] border-[#1E3A63]'
                }`}
              >
                {selectedNodeEval.status}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#94A8C7] leading-relaxed">
              {selectedNode.description}
            </p>

            <div className="p-3.5 rounded-xl bg-[#061225] border border-[#1E3A63] space-y-1">
              <div className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#38D9F5]">
                Real-Life Practice
              </div>
              <p className="text-xs text-[#94A8C7]">
                {selectedNode.realLifePractice}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#061225] border border-[#1E3A63] space-y-2">
              <div className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#38D9F5]">
                Unlock Requirements
              </div>
              <ul className="space-y-1.5 text-xs text-[#94A8C7]">
                <li className="flex items-center gap-2">
                  {activeAttrProgress.level >= selectedNode.requirements.minAttributeLevel ? (
                    <Check className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-[#647A9E] shrink-0" />
                  )}
                  <span className="tabular-nums">
                    {activeAttrDef.name} Level {selectedNode.requirements.minAttributeLevel} (You: Lv.{activeAttrProgress.level})
                  </span>
                </li>
                {selectedNode.requirements.minVerifiedActivities ? (
                  <li className="flex items-center gap-2">
                    {activeAttrProgress.totalActivities >=
                    selectedNode.requirements.minVerifiedActivities ? (
                      <Check className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-[#647A9E] shrink-0" />
                    )}
                    <span className="tabular-nums">
                      {selectedNode.requirements.minVerifiedActivities} Verified Activities (You:{' '}
                      {activeAttrProgress.totalActivities})
                    </span>
                  </li>
                ) : null}
                {selectedNode.requirements.prerequisiteNodeIds.map(pid => {
                  const met = skillTreeState.unlockedNodeIds.includes(pid);
                  const prereq = activeAttrDef.nodes.find(n => n.id === pid);
                  return (
                    <li key={pid} className="flex items-center gap-2">
                      {met ? (
                        <Check className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-[#647A9E] shrink-0" />
                      )}
                      <span>Prerequisite: {prereq?.name || pid}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {unlockFeedback && (
              <div
                role="status"
                className={`p-3 rounded-xl border text-xs ${
                  unlockFeedback.type === 'success'
                    ? 'bg-[#10B981]/10 border-[#10B981]/45 text-[#10B981]'
                    : 'bg-[#F43F5E]/10 border-[#F43F5E]/45 text-[#F43F5E]'
                }`}
              >
                {unlockFeedback.message}
              </div>
            )}

            {selectedNodeEval.status === 'unlocked' ? (
              <div className="p-3 rounded-xl bg-[#061225] border border-[#10B981]/45 text-xs text-[#10B981] flex items-center gap-2 font-semibold">
                <Shield className="w-4 h-4 shrink-0 text-[#FBBF24]" />
                Mastery Title Active: {selectedNode.masteryTitle}
              </div>
            ) : selectedNodeEval.status === 'available' ? (
              <button
                type="button"
                disabled={isMutating || skillTreeLoading}
                onClick={() => void handleUnlockNode(selectedNode)}
                className="lq-btn lq-btn-gold w-full py-2.5 px-4 font-['Cinzel'] font-black text-xs tracking-wider uppercase"
              >
                {isMutating ? 'Verifying Mastery...' : `Unlock "${selectedNode.name}"`}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full py-2.5 px-4 rounded-xl bg-[#061225] border border-[#1E3A63] text-[#647A9E] font-['Cinzel'] font-bold text-xs tracking-wider uppercase cursor-not-allowed"
              >
                Locked · Meet Requirements Above
              </button>
            )}
          </div>

          {/* Recent Verified Skill XP Ledger */}
          <div className="rounded-2xl bg-[#0A1930] border border-[#1E3A63] shadow-[0_14px_34px_-14px_rgba(3,10,24,0.85)] p-5 space-y-3">
            <h4 className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-[#38D9F5]">
              Recent Verified Attribute XP
            </h4>
            {skillTreeState.recentEvents.length === 0 ? (
              <div className="text-xs text-[#94A8C7] py-4 text-center space-y-2">
                <p>No skill XP events recorded yet.</p>
                <p className="text-[11px] text-[#647A9E]">
                  Complete a workout, daily habit, meal log, hydration goal, or verified study session to advance your Skill Tree.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#1E3A63] max-h-72 overflow-y-auto pr-1">
                {skillTreeState.recentEvents.slice(0, 12).map(evt => (
                  <div
                    key={evt.id}
                    className="py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[#F2F7FF] capitalize truncate">
                        {evt.attributeId} · {evt.activityType.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[10px] text-[#647A9E] truncate">
                        {new Date(evt.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {evt.safetyCapped ? ' · Daily Cap Reached' : ''}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-[#10B981] shrink-0 tabular-nums">
                      +{evt.xpAwarded} XP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verified Study / Focus Session Modal */}
      <RpgModalWrapper
        isOpen={showStudyModal}
        onClose={() => setShowStudyModal(false)}
        panelClassName="w-full max-w-md"
      >
        <div
          className="w-full rounded-2xl bg-[#0A1930] border border-[#1677FF]/65 p-6 shadow-[0_24px_60px_rgba(3,10,24,0.92)] space-y-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verified-study-title"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-widest text-[#38D9F5]">
                Focus Attribute Training
              </span>
              <h3
                id="verified-study-title"
                className="font-['Cinzel'] font-bold text-lg text-[#F2F7FF]"
              >
                Log Verified Study Session
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowStudyModal(false)}
              aria-label="Close modal"
              className="p-1.5 rounded-lg text-[#94A8C7] hover:text-[#F2F7FF] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmitStudySession} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-[#94A8C7] mb-1">
                Subject or Skill Studied
              </label>
              <input
                type="text"
                required
                value={studyTopic}
                onChange={e => setStudyTopic(e.target.value)}
                placeholder="e.g. Algorithms, Spanish Reading, Anatomy"
                className="lq-input w-full px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A8C7] mb-1">
                Focused Duration (Minutes · 10–240)
              </label>
              <input
                type="number"
                min={10}
                max={240}
                required
                value={studyMinutes}
                onChange={e => setStudyMinutes(Number(e.target.value))}
                className="lq-input w-full px-3.5 py-2 text-sm font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A8C7] mb-1">
                Key Takeaway / Verification Reflection (min 12 chars)
              </label>
              <textarea
                rows={3}
                required
                value={studyReflection}
                onChange={e => setStudyReflection(e.target.value)}
                placeholder="Summarize one concept you practiced or solved..."
                className="lq-input w-full px-3.5 py-2 text-sm"
              />
            </div>

            {studyStatusMsg && (
              <div
                className={`p-3 rounded-xl border text-xs ${
                  studyStatusMsg.type === 'success'
                    ? 'bg-[#10B981]/10 border-[#10B981]/45 text-[#10B981]'
                    : 'bg-[#F43F5E]/10 border-[#F43F5E]/45 text-[#F43F5E]'
                }`}
              >
                {studyStatusMsg.message}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowStudyModal(false)}
                className="lq-btn lq-btn-secondary px-4 py-2 text-xs"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmittingStudy}
                className="lq-btn lq-btn-primary px-4 py-2 font-['Cinzel'] font-bold text-xs tracking-wider uppercase"
              >
                {isSubmittingStudy ? 'Verifying...' : 'Verify & Award Focus XP'}
              </button>
            </div>
          </form>
        </div>
      </RpgModalWrapper>
    </div>
  );
};
