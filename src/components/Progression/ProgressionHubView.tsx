import React from 'react';
import { useGame } from '../../context/GameContext';
import { QuestsView } from '../Quests/QuestsView';
import { DailyQuestReportView } from '../Quests/DailyQuestReportView';
import { AchievementsView } from '../Achievements/AchievementsView';
import { HallOfLegendsView } from '../Achievements/HallOfLegendsView';
import { SkillTreeView } from '../SkillTree/SkillTreeView';
import { SeasonalProgressionView } from '../Seasons/SeasonalProgressionView';
import { DailyCalendarView } from './DailyCalendarView';
import { SKILL_TREE_ATTRIBUTES, evaluateSkillNodeStatus } from '../../data/skillTreeData';
import { Scroll, ScrollText, Award, Crown, GitBranch, Calendar, CalendarCheck } from 'lucide-react';
import { getPeriodKeyForFrequency, getUserTimezone } from '../../services/unifiedBackendService';

export const ProgressionHubView: React.FC = () => {
  const {
    user,
    progressionSubTab,
    setProgressionSubTab,
    quests,
    dynamicDailyQuests,
    achievements,
    hallOfLegends,
    skillTreeState,
    seasonState,
    dailyCalendarState,
  } = useGame();

  const todayKey = getPeriodKeyForFrequency('daily', user?.timezone || getUserTimezone());
  const todaysAi = dynamicDailyQuests.filter(q => q.periodKey === todayKey);

  const claimableClassicQuests = quests.filter(q => q.completed && !q.claimed).length;
  const claimableAiQuests = todaysAi.filter(q => q.completed && !q.claimed).length;
  const claimableQuestsCount = claimableClassicQuests + claimableAiQuests;
  const activeQuestsCount =
    quests.filter(q => !q.claimed).length + todaysAi.filter(q => !q.claimed).length;
  const claimableAchievementsCount = achievements.filter(a => a.unlocked && !a.claimed).length;
  const unlockedAchievementsCount = achievements.filter(a => a.unlocked).length;
  const readyLegendsCount = hallOfLegends.filter(h => h.eligibleToClaim).length;

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
    id:
      | 'quests'
      | 'daily-report'
      | 'achievements'
      | 'hall-of-legends'
      | 'skill-tree'
      | 'seasons'
      | 'daily-calendar';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'quests', label: 'Quest Board', icon: Scroll, badge: claimableQuestsCount },
    { id: 'skill-tree', label: 'Skill Tree', icon: GitBranch, badge: readySkillNodesCount },
    { id: 'seasons', label: 'Battle Pass', icon: Calendar, badge: claimableSeasonCount },
    {
      id: 'daily-calendar',
      label: 'Daily Calendar',
      icon: CalendarCheck,
      badge: dailyCalendarState && !dailyCalendarState.claimedToday ? 1 : 0,
    },
    { id: 'daily-report', label: 'Daily Report', icon: ScrollText },
    { id: 'achievements', label: 'Achievements', icon: Award, badge: claimableAchievementsCount },
    { id: 'hall-of-legends', label: 'Hall of Legends', icon: Crown, badge: readyLegendsCount },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Unified Progression Hub Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#170e2f] via-[#100a20] to-[#1a1236] border border-[#C5A15A]/25 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5 text-xs">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#C5A15A]">
                Path of Honor
              </span>
              <span className="text-[#D9D2C5]/35" aria-hidden="true">·</span>
              <span className="text-[#D9D2C5]/75 font-medium tabular-nums">
                {activeQuestsCount} Active {activeQuestsCount === 1 ? 'Quest' : 'Quests'}
              </span>
              <span className="text-[#D9D2C5]/35" aria-hidden="true">·</span>
              <span className="text-[#D9D2C5]/75 font-medium tabular-nums">
                {unlockedAchievementsCount}/{achievements.length} Achievements
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] tracking-wide text-white">
              PROGRESSION
            </h1>
            <p className="text-xs sm:text-sm text-[#D9D2C5]/75 max-w-2xl mt-1">
              Forge personalized AI daily quests, review your Daily Progression Report, earn heroic achievements, and compete for 52 one-of-one Worldwide Titles in the Hall of Legends.
            </p>
          </div>

          {/* Unified Hub Tabs */}
          <div
            role="tablist"
            aria-label="Progression sections"
            className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 p-1.5 bg-[#090714]/90 border border-[#C5A15A]/20 rounded-xl self-start xl:self-auto overflow-x-auto max-w-full"
          >
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = progressionSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => setProgressionSubTab(tab.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#251638] text-[#C5A15A] border border-[#C5A15A]/45 shadow-md'
                      : 'text-[#D9D2C5]/65 hover:text-[#D9D2C5] hover:bg-[#1a112b]/70 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#C5A15A]' : 'text-[#D9D2C5]/50'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-mono font-bold tabular-nums">
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
        {progressionSubTab === 'daily-calendar' && <DailyCalendarView />}
        {progressionSubTab === 'daily-report' && <DailyQuestReportView />}
        {progressionSubTab === 'achievements' && <AchievementsView embedded />}
        {progressionSubTab === 'hall-of-legends' && <HallOfLegendsView />}
      </div>
    </div>
  );
};
