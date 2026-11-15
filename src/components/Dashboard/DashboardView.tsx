import React from 'react';
import { useGame } from '../../context/GameContext';
import { HeroCommandStage } from './HeroCommandStage';
import { FitnessCommandCenter } from './FitnessCommandCenter';

export const DashboardView: React.FC = () => {
  const {
    user,
    stats,
    selectedHeroId,
    heroLocked,
    setShowHeroSelectModal,
    rpgAttributes,
    weapons,
    equippedWeapon,
    equippedGear,
    activeBuffs,
    setActiveTab,
  } = useGame();

  return (
    <div className="space-y-8 pb-14 max-w-[1400px] mx-auto">
      {/* 1. AAA Character Command Center: Identity, Hero Showcase, Equipped Loadout & Attributes */}
      <HeroCommandStage
        user={user}
        stats={stats}
        selectedHeroId={selectedHeroId}
        heroLocked={heroLocked}
        rpgAttributes={rpgAttributes}
        weapons={weapons}
        equippedWeapon={equippedWeapon}
        equippedGear={equippedGear}
        activeBuffs={activeBuffs}
        onNavigate={setActiveTab}
        onOpenHeroSelect={() => setShowHeroSelectModal(true)}
      />

      {/* 2. Physical Conditioning & Real-Life Fitness Progression */}
      <FitnessCommandCenter />
    </div>
  );
};
