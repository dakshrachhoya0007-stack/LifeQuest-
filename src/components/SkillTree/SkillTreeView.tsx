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
            <div className="w-14 h-14 rounded-2xl bg-[#100D18] border border-[#D6A84B]/45 flex items-center justify-center shrink-0 shadow-[0_0_18px_rgba(214,168,75,0.2)]">
              <GoldenWorldTreeEmblem className="w-11 h-11" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#A69AAF]">
                <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#49B88A]">
                  Real-Life Skill Tree
                </span>
                <span className="text-[#766D82]" aria-hidden="true">·</span>
                <span className="tabular-nums font-mono">
                  <AnimatedCounter value={totalXpDisplay} /> Attribute XP
                </span>
                <span className="text-[#766D82]" aria-hidden="true">·</span>
                <span className="tabular-nums font-mono">
                  <AnimatedCounter value={totalActivitiesDisplay} /> Verified Activities
                </span>
                <span className="text-[#766D82]" aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {totalUnlockedNodes} / 54 Skills Unlocked
                </span>
                <span className="text-[#766D82]" aria-hidden="true">·</span>
                <span className="tabular-nums text-[#E8C777] font-semibold">
                  {totalAvailableNodes} Ready
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black font-['Cinzel'] tracking-wide text-[#F2EDF7] mt-1 text-balance">
                ATTRIBUTES OF AETHERIA
              </h1>
              <p className="text-xs sm:text-sm text-[#A69AAF] max-w-2xl mt-1 leading-relaxed">
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
              <RefreshCw className={`w-3.5 h-3.5 text-[#49B88A] ${reconciling ? 'animate-spin' : ''}`} />
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
              <BookOpen className="w-3.5 h-3.5 text-[#B998E3]" />
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
          <div className="mt-4 pt-3 border-t border-[#362B45] text-xs text-[#49B88A] flex items-center justify-between gap-2">
            <span>{reconcileNotice}</span>
            <button
              type="button"
              onClick={() => setReconcileNotice(null)}
              className="text-[#49B88A]/75 hover:text-[#F2EDF7] cursor-pointer"
              aria-label="Dismiss sync notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </FeatureBanner>

      {/* Synchronized Skill Tree Analytics (Daily Activity + 6-Attribute Balance) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 rounded-2xl bg-[#171220] border border-[#362B45] shadow-[0_14px_34px_-14px_rgba(5,3,10,0.85)] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-['Cinzel'] font-bold text-sm uppercase tracking-wider text-[#F2EDF7] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#49B88A]" />
                Verified Attribute XP History
              </h2>
              <p className="text-[11px] text-[#A69AAF] mt-0.5 tabular-nums">
                1:1 Ledger Output · {totalXpDisplay.toLocaleString()} Total XP across {totalActivitiesDisplay} verified activities
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-[#100D18] rounded-lg border border-[#362B45]">
              {(['7d', '30d'] as const).map(win => (
                <button
                  key={win}
                  type="button"
                  onClick={() => setChartWindow(win)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold uppercase transition-colors cursor-pointer ${
                    chartWindow === win
                      ? 'bg-[#7045A0] text-[#F2EDF7]'
                      : 'text-[#A69AAF] hover:text-[#F2EDF7]'
                  }`}
                >
                  {win}
                </button>
              ))}
            </div>
          </div>

          {dailySeries.length === 0 ? (
            <div className="h-36 flex items-center justify-center text-xs text-[#A69AAF]">
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
                                ? 'bg-gradient-to-t from-[#7045A0] via-[#9A72CC] to-[#E8C777] group-hover:brightness-110'
                                : 'bg-[#21152F]'
                            }`}
                            style={{ height: `${pt.totalXp > 0 ? heightPct : 3}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#A69AAF] tabular-nums">
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
        <div className="lg:col-span-5 rounded-2xl bg-[#171220] border border-[#362B45] shadow-[0_14px_34px_-14px_rgba(5,3,10,0.85)] p-5 flex flex-col justify-between gap-3">
          <div>
            <h2 className="font-['Cinzel'] font-bold text-sm uppercase tracking-wider text-[#F2EDF7]">
              Virtue Balance Radar
            </h2>
            <p className="text-[11px] text-[#A69AAF] mt-0.5">
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
                      stroke="rgba(112, 69, 160, 0.38)"
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
                        stroke="rgba(166, 154, 175, 0.2)"
                        strokeWidth="1"
                      />
                    );
                  })}
                  <polygon
                    points={polygonPoints}
                    fill="rgba(112, 69, 160, 0.34)"
                    stroke="#E8C777"
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
                    <span className="font-semibold text-[#A69AAF] truncate" style={{ color: attr.accentHex }}>
                      {attr.name}
                    </span>
                    <span className="font-mono text-[#F2EDF7]">
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
        <div className="rounded-xl bg-[#21152F] border border-[#D6A84B]/55 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles className="w-4 h-4 text-[#E8C777] shrink-0" />
            <p className="text-xs sm:text-sm text-[#F2EDF7]">
              <strong className="font-['Cinzel'] text-[#E8C777] uppercase tracking-wider">
                +{lastSkillAwardBanner.xpAwarded} {lastSkillAwardBanner.attributeId} XP
              </strong>
              {lastSkillAwardBanner.leveledUp && (
                <span className="ml-2 text-[#49B88A] font-semibold">
                  · Level Up! Now Level {lastSkillAwardBanner.newLevel}
                </span>
              )}
              {lastSkillAwardBanner.safetyCapped && (
                <span className="ml-2 text-[#A69AAF] text-xs">
                  · Healthy daily safety cap applied
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={dismissSkillAwardBanner}
            aria-label="Dismiss notification"
            className="p-1 rounded-lg text-[#A69AAF] hover:text-[#F2EDF7] cursor-pointer"
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
                  ? 'bg-[#21152F] border-[#D6A84B]/70 shadow-[0_0_20px_rgba(112,69,160,0.28)]'
                  : 'bg-[#171220] border-[#362B45] hover:border-[#7045A0]/70 hover:bg-[#21152F]/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#100D18] border border-[#362B45]"
                  style={{ color: attr.accentHex }}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="font-mono text-xs font-bold text-[#F2EDF7] tabular-nums">
                  Lv.{prog.level}/10
                </span>
              </div>

              <div className="font-['Cinzel'] font-bold text-xs sm:text-sm text-[#F2EDF7] truncate">
                {attr.name}
              </div>

              <div className="w-full h-1.5 rounded-full bg-[#100D18] overflow-hidden mt-2 mb-1.5">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${prog.progressPercent}%`,
                    backgroundColor: attr.accentHex,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#A69AAF] tabular-nums">
                <span>{unlockedInAttr}/9 Nodes</span>
                {availableInAttr > 0 ? (
                  <span className="text-[#E8C777] font-bold">
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
          <div className="rounded-2xl bg-[#171220] border border-[#362B45] shadow-[0_14px_34px_-14px_rgba(5,3,10,0.85)] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#A69AAF]">
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
                <h2 className="text-lg sm:text-xl font-['Cinzel'] font-bold text-[#F2EDF7] mt-0.5">
                  {activeAttrDef.subtitle}
                </h2>
                <p className="text-xs text-[#A69AAF] mt-1 max-w-2xl">
                  {activeAttrDef.description}
                </p>
              </div>

              <div className="sm:text-right shrink-0">
                <div className="font-mono text-2xl font-black text-[#F2EDF7] tabular-nums">
                  Level {activeAttrProgress.level}{' '}
                  <span className="text-sm font-normal text-[#766D82]">/ 10</span>
                </div>
                <div className="text-[11px] font-mono text-[#E8C777] tabular-nums">
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
                className="w-full h-2.5 rounded-full bg-[#100D18] border border-[#362B45] overflow-hidden"
                barClassName="bg-[#7045A0]"
                barStyle={{ backgroundColor: activeAttrDef.accentHex }}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-[11px] text-[#A69AAF] tabular-nums">
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
          <div className="rounded-2xl bg-[#171220] border border-[#362B45] p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-['Cinzel'] font-bold text-sm uppercase tracking-widest text-[#E8C777]">
                Three Skill Branches
              </h3>
              <span className="text-[11px] text-[#A69AAF]">
                Select any node to inspect requirements or unlock
              </span>
            </div>

            {/* Root Canopy Connector SVG on Desktop */}
            <div className="hidden md:block w-full h-8 -mb-1" aria-hidden="true">
              <svg viewBox="0 0 600 40" className="w-full h-full" preserveAspectRatio="none">
                <circle cx="300" cy="6" r="4" fill="#E8C777" />
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
                    className="rounded-xl bg-[#100D18] border border-[#362B45] p-4 flex flex-col"
                  >
                    <div className="text-center pb-3 mb-3 border-b border-[#362B45]">
                      <h4 className="font-['Cinzel'] font-bold text-sm text-[#F2EDF7]">
                        {branch.name}
                      </h4>
                      <p className="text-[11px] text-[#A69AAF] mt-0.5">
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
                                        ? '#49B88A'
                                        : prevUnlocked
                                        ? '#9A72CC'
                                        : 'rgba(166, 154, 175, 0.25)'
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
                                        ? '#49B88A'
                                        : isAvailable
                                        ? '#E8C777'
                                        : '#171220'
                                    }
                                    stroke={
                                      isUnlocked
                                        ? '#49B88A'
                                        : isAvailable
                                        ? '#E8C777'
                                        : 'rgba(166, 154, 175, 0.28)'
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
                                  ? 'ring-2 ring-[#E8C777] scale-[1.02] motion-reduce:scale-100'
                                  : ''
                              } ${
                                isUnlocked
                                  ? 'bg-gradient-to-br from-[#21152F] to-[#192822] border-[#49B88A]/70 text-[#F2EDF7] shadow-[0_0_18px_rgba(73,184,138,0.18)]'
                                  : isAvailable
                                  ? 'bg-[#21152F] border-[#D6A84B] text-[#F2EDF7] shadow-[0_0_16px_rgba(214,168,75,0.22)]'
                                  : 'bg-[#171220]/90 border-[#362B45] text-[#A69AAF] opacity-80 hover:opacity-100 hover:border-[#7045A0]/65'
                              } ${isSelected ? 'ring-2 ring-[#7045A0]' : ''}`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-[#A69AAF] tabular-nums">
                                  Tier {node.tier} · Lv.{node.requirements.minAttributeLevel}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                                    isUnlocked
                                      ? 'text-[#49B88A]'
                                      : isAvailable
                                      ? 'text-[#E8C777]'
                                      : 'text-[#766D82]'
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
                              <div className="font-['Cinzel'] font-bold text-sm text-[#F2EDF7]">
                                {node.name}
                              </div>
                              <div className="text-[11px] text-[#A69AAF] mt-0.5 line-clamp-2">
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
          <div className="rounded-2xl bg-[#171220] border border-[#362B45] shadow-[0_14px_34px_-14px_rgba(5,3,10,0.85)] p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-['Cinzel'] font-bold text-sm uppercase tracking-wider text-[#F2EDF7] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#E8C777]" />
                {activeAttrDef.name} Milestones
              </h3>
              <span className="text-[11px] text-[#A69AAF]">
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
                        ? 'bg-[#49B88A]/10 border-[#49B88A]/45'
                        : canClaim
                        ? 'bg-[#21152F] border-[#D6A84B]/70 shadow-[0_0_16px_rgba(214,168,75,0.18)]'
                        : 'bg-[#100D18] border-[#362B45]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                        <span className="text-[#49B88A] font-bold">
                          Lv.{ms.requiredLevel}
                          {ms.requiredNodesUnlocked
                            ? ` · ${ms.requiredNodesUnlocked} Nodes`
                            : ''}
                        </span>
                        <span className="text-[#E8C777]">{ms.honorSeal}</span>
                      </div>
                      <h4 className="font-['Cinzel'] font-bold text-sm text-[#F2EDF7] mt-1">
                        {ms.title}
                      </h4>
                      <p className="text-xs text-[#A69AAF] mt-0.5">
                        {ms.description}
                      </p>
                    </div>

                    <div>
                      {isClaimed ? (
                        <div className="text-[11px] font-semibold text-[#49B88A] flex items-center gap-1.5">
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
                        <div className="text-[11px] text-[#766D82] flex items-center gap-1.5">
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
          <div className="rounded-2xl bg-[#171220] border border-[#362B45] shadow-[0_14px_34px_-14px_rgba(5,3,10,0.85)] p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#E8C777]">
                  {selectedNode.branchName} · Tier {selectedNode.tier}
                </div>
                <h3 className="font-['Cinzel'] font-bold text-xl text-[#F2EDF7] mt-0.5">
                  {selectedNode.name}
                </h3>
                <p className="text-xs italic text-[#A69AAF] mt-0.5">
                  &ldquo;{selectedNode.tagline}&rdquo;
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                  selectedNodeEval.status === 'unlocked'
                    ? 'bg-[#49B88A]/12 text-[#49B88A] border-[#49B88A]/45'
                    : selectedNodeEval.status === 'available'
                    ? 'bg-[#D6A84B]/12 text-[#E8C777] border-[#D6A84B]'
                    : 'bg-[#100D18] text-[#766D82] border-[#362B45]'
                }`}
              >
                {selectedNodeEval.status}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#A69AAF] leading-relaxed">
              {selectedNode.description}
            </p>

            <div className="p-3.5 rounded-xl bg-[#100D18] border border-[#362B45] space-y-1">
              <div className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#B998E3]">
                Real-Life Practice
              </div>
              <p className="text-xs text-[#A69AAF]">
                {selectedNode.realLifePractice}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#100D18] border border-[#362B45] space-y-2">
              <div className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#E8C777]">
                Unlock Requirements
              </div>
              <ul className="space-y-1.5 text-xs text-[#A69AAF]">
                <li className="flex items-center gap-2">
                  {activeAttrProgress.level >= selectedNode.requirements.minAttributeLevel ? (
                    <Check className="w-3.5 h-3.5 text-[#49B88A] shrink-0" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-[#766D82] shrink-0" />
                  )}
                  <span className="tabular-nums">
                    {activeAttrDef.name} Level {selectedNode.requirements.minAttributeLevel} (You: Lv.{activeAttrProgress.level})
                  </span>
                </li>
                {selectedNode.requirements.minVerifiedActivities ? (
                  <li className="flex items-center gap-2">
                    {activeAttrProgress.totalActivities >=
                    selectedNode.requirements.minVerifiedActivities ? (
                      <Check className="w-3.5 h-3.5 text-[#49B88A] shrink-0" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-[#766D82] shrink-0" />
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
                        <Check className="w-3.5 h-3.5 text-[#49B88A] shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-[#766D82] shrink-0" />
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
                    ? 'bg-[#49B88A]/10 border-[#49B88A]/45 text-[#49B88A]'
                    : 'bg-[#D65C66]/10 border-[#D65C66]/45 text-[#D65C66]'
                }`}
              >
                {unlockFeedback.message}
              </div>
            )}

            {selectedNodeEval.status === 'unlocked' ? (
              <div className="p-3 rounded-xl bg-[#100D18] border border-[#49B88A]/45 text-xs text-[#49B88A] flex items-center gap-2 font-semibold">
                <Shield className="w-4 h-4 shrink-0 text-[#E8C777]" />
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
                className="w-full py-2.5 px-4 rounded-xl bg-[#100D18] border border-[#362B45] text-[#766D82] font-['Cinzel'] font-bold text-xs tracking-wider uppercase cursor-not-allowed"
              >
                Locked · Meet Requirements Above
              </button>
            )}
          </div>

          {/* Recent Verified Skill XP Ledger */}
          <div className="rounded-2xl bg-[#171220] border border-[#362B45] shadow-[0_14px_34px_-14px_rgba(5,3,10,0.85)] p-5 space-y-3">
            <h4 className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-[#E8C777]">
              Recent Verified Attribute XP
            </h4>
            {skillTreeState.recentEvents.length === 0 ? (
              <div className="text-xs text-[#A69AAF] py-4 text-center space-y-2">
                <p>No skill XP events recorded yet.</p>
                <p className="text-[11px] text-[#766D82]">
                  Complete a workout, daily habit, meal log, hydration goal, or verified study session to advance your Skill Tree.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#362B45] max-h-72 overflow-y-auto pr-1">
                {skillTreeState.recentEvents.slice(0, 12).map(evt => (
                  <div
                    key={evt.id}
                    className="py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[#F2EDF7] capitalize truncate">
                        {evt.attributeId} · {evt.activityType.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[10px] text-[#766D82] truncate">
                        {new Date(evt.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {evt.safetyCapped ? ' · Daily Cap Reached' : ''}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-[#49B88A] shrink-0 tabular-nums">
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
          className="w-full rounded-2xl bg-[#171220] border border-[#7045A0]/65 p-6 shadow-[0_24px_60px_rgba(5,3,10,0.92)] space-y-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verified-study-title"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-widest text-[#E8C777]">
                Focus Attribute Training
              </span>
              <h3
                id="verified-study-title"
                className="font-['Cinzel'] font-bold text-lg text-[#F2EDF7]"
              >
                Log Verified Study Session
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowStudyModal(false)}
              aria-label="Close modal"
              className="p-1.5 rounded-lg text-[#A69AAF] hover:text-[#F2EDF7] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmitStudySession} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-[#A69AAF] mb-1">
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
              <label className="block text-xs font-medium text-[#A69AAF] mb-1">
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
              <label className="block text-xs font-medium text-[#A69AAF] mb-1">
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
                    ? 'bg-[#49B88A]/10 border-[#49B88A]/45 text-[#49B88A]'
                    : 'bg-[#D65C66]/10 border-[#D65C66]/45 text-[#D65C66]'
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
