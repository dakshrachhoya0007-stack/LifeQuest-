import React from 'react';
import { useGame } from '../../context/GameContext';
import { QuestsView } from '../Quests/QuestsView';
import { SkillTreeView } from '../SkillTree/SkillTreeView';
import { SeasonalProgressionView } from '../Seasons/SeasonalProgressionView';
import { SKILL_TREE_ATTRIBUTES, evaluateSkillNodeStatus } from '../../data/skillTreeData';
import { Scroll, GitBranch, Calendar } from 'lucide-react';
import { getPeriodKeyForFrequency, getUserTimezone } from '../../services/unifiedBackendService';

export const ProgressionHubView: React.FC = () => {
  const {
    user,
    progressionSubTab,
    setProgressionSubTab,
    quests,
    dynamicDailyQuests,
    achievements,
    skillTreeState,
    seasonState,
    dailyCalendarState,
  } = useGame();

  const todayKey = getPeriodKeyForFrequency('daily', user?.timezone || getUserTimezone());
  const todaysDaily = dynamicDailyQuests.filter(q => q.periodKey === todayKey);

  const claimableClassicQuests = quests.filter(q => q.completed && !q.claimed).length;
  const claimableDailyQuests = todaysDaily.filter(q => q.completed && !q.claimed).length;
  const claimableAchievementsCount = achievements.filter(a => a.unlocked && !a.claimed).length;
  const claimableCalendarCount = dailyCalendarState && !dailyCalendarState.claimedToday ? 1 : 0;
  const questBoardBadge =
    claimableClassicQuests + claimableDailyQuests + claimableAchievementsCount + claimableCalendarCount;

  const activeQuestsCount =
    quests.filter(q => !q.claimed).length + todaysDaily.filter(q => !q.claimed).length;
  const unlockedAchievementsCount = achievements.filter(a => a.unlocked).length;

  let readySkillNodesCount = 0;
  for (const attr of SKILL_TREE_ATTRIBUTES) {
    const prog = skillTreeState.attributes[attr.id];
    for (const node of attr.nodes) {
      if (evaluateSkillNodeStatus(node, prog, skillTreeState.unlockedNodeIds).status === 'available') {
        readySkillNodesCount += 1;
      }
    }
  }

  const claimableSeasonCount = seasonState
    ? Object.values(seasonState.playerProgress.challengeProgress || {}).filter(
        c => c.completed && !c.claimed
      ).length +
      seasonState.season.milestones.filter(
        m =>
          seasonState.playerProgress.seasonXp >= m.requiredSeasonXp &&
          !seasonState.playerProgress.claimedMilestoneIds.includes(m.id)
      ).length
    : 0;

  const tabs: Array<{
    id: 'quests' | 'skill-tree' | 'seasons';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'quests', label: 'Quest Board', icon: Scroll, badge: questBoardBadge },
    { id: 'skill-tree', label: 'Skill Tree', icon: GitBranch, badge: readySkillNodesCount },
    { id: 'seasons', label: 'Battle Pass', icon: Calendar, badge: claimableSeasonCount },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Unified Progression Hub Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#19122B] via-[#24143D] to-[#19122B] border border-[#E7B94F]/35 p-5 sm:p-6 shadow-[0_12px_32px_rgba(10,6,20,0.65)] backdrop-blur-md">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5 text-xs">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#FFD978]">
                Path of Honor
              </span>
              <span className="text-[#BEB4D6]/40" aria-hidden="true">·</span>
              <span className="text-[#BEB4D6] font-medium tabular-nums">
                {activeQuestsCount} Active {activeQuestsCount === 1 ? 'Quest' : 'Quests'}
              </span>
              <span className="text-[#BEB4D6]/40" aria-hidden="true">·</span>
              <span className="text-[#BEB4D6] font-medium tabular-nums">
                {unlockedAchievementsCount}/{achievements.length} Achievements
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] tracking-wide text-[#F7F4FF]">
              PROGRESSION
            </h1>
            <p className="text-xs sm:text-sm text-[#BEB4D6] max-w-2xl mt-1">
              Plan daily quests, track calendar consistency, master six real-life attributes, and advance your seasonal Battle Pass.
            </p>
          </div>

          {/* 3-Tab Progression Switcher */}
          <div
            role="tablist"
            aria-label="Progression sections"
            className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 p-1.5 bg-[#100D1C]/90 border border-[#6638B8]/35 rounded-xl self-start xl:self-auto overflow-x-auto max-w-full"
          >
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = progressionSubTab === tab.id;
              const activeClass =
                tab.id === 'skill-tree'
                  ? 'bg-gradient-to-r from-[#6638B8] to-[#38D9F5] text-[#100D1C] font-bold border border-[#38D9F5]/60 shadow-[0_0_18px_rgba(56,217,245,0.35)]'
                  : 'bg-gradient-to-r from-[#E7B94F] to-[#FFAA45] text-[#100D1C] font-bold border border-[#FFD978]/60 shadow-[0_0_18px_rgba(231,185,79,0.35)]';
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => setProgressionSubTab(tab.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? activeClass
                      : 'text-[#BEB4D6] hover:text-white hover:bg-[#24143D] border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? 'text-[#100D1C]'
                        : tab.id === 'skill-tree'
                        ? 'text-[#38D9F5]'
                        : 'text-[#FFD978]'
                    }`}
                  />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold tabular-nums ${
                        isActive ? 'bg-[#100D1C] text-[#FFD978]' : 'bg-[#E7B94F] text-[#100D1C]'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Progression Tab Content */}
      <div role="tabpanel">
        {progressionSubTab === 'quests' && <QuestsView embedded />}
        {progressionSubTab === 'skill-tree' && <SkillTreeView />}
        {progressionSubTab === 'seasons' && <SeasonalProgressionView />}
      </div>
    </div>
  );
};
