import React from 'react';
import { useGame } from '../../context/GameContext';
import { QuestsView } from '../Quests/QuestsView';
import { SkillTreeView } from '../SkillTree/SkillTreeView';
import { SKILL_TREE_ATTRIBUTES, evaluateSkillNodeStatus } from '../../data/skillTreeData';
import { Scroll, GitBranch } from 'lucide-react';
import { getPeriodKeyForFrequency, getUserTimezone } from '../../services/unifiedBackendService';
import { FeatureBanner, FeatureTabBar } from '../Theme/FeatureThemePrimitives';
import { RpgSubTabTransition } from '../Motion/RpgMotionPrimitives';

export const ProgressionHubView: React.FC = () => {
  const {
    user,
    progressionSubTab,
    setProgressionSubTab,
    quests,
    dynamicDailyQuests,
    achievements,
    skillTreeState,
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

  const tabs: Array<{
    id: 'quests' | 'skill-tree';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'quests', label: 'Quests & Achievements', icon: Scroll, badge: questBoardBadge },
    { id: 'skill-tree', label: 'Skill Tree', icon: GitBranch, badge: readySkillNodesCount },
  ];

  const activeTabId = progressionSubTab === 'skill-tree' ? 'skill-tree' : 'quests';

  return (
    <div className="space-y-6">
      <FeatureBanner themeId={activeTabId === 'skill-tree' ? 'skill-tree' : 'quests'}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5 text-xs">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#E8C777]">
                Path of Honor
              </span>
              <span className="text-[#766D82]" aria-hidden="true">·</span>
              <span className="text-[#A69AAF] font-medium tabular-nums">
                {activeQuestsCount} Active {activeQuestsCount === 1 ? 'Quest' : 'Quests'}
              </span>
              <span className="text-[#766D82]" aria-hidden="true">·</span>
              <span className="text-[#A69AAF] font-medium tabular-nums">
                {unlockedAchievementsCount}/{achievements.length} Achievements
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] tracking-wide text-[#F2EDF7] text-balance">
              QUESTS &amp; ACHIEVEMENTS
            </h1>
            <p className="text-xs sm:text-sm text-[#A69AAF] max-w-2xl mt-1">
              Complete daily quests, maintain monthly recovery streaks, claim achievements, and master six real-life skill branches.
            </p>
          </div>

          <FeatureTabBar
            tabs={tabs}
            activeId={activeTabId}
            onSelect={setProgressionSubTab}
            ariaLabel="Progression sections"
            layoutId="progression-hub-tab"
            className="self-start lg:self-auto"
          />
        </div>
      </FeatureBanner>

      <div role="tabpanel">
        <RpgSubTabTransition tabKey={activeTabId}>
          {activeTabId === 'quests' && <QuestsView embedded />}
          {activeTabId === 'skill-tree' && <SkillTreeView />}
        </RpgSubTabTransition>
      </div>
    </div>
  );
};
