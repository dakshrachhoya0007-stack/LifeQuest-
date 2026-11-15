import React, { useState } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { TopBar } from './components/Navigation/TopBar';
import { Sidebar } from './components/Navigation/Sidebar';
import { WelcomeLanding } from './components/Welcome/WelcomeLanding';
import { AuthModal } from './components/Auth/AuthModal';
import { AuthErrorScreen } from './components/Auth/AuthErrorScreen';
import { DataMigrationModal } from './components/Auth/DataMigrationModal';
import { SupabaseConfigModal } from './components/Auth/SupabaseConfigModal';
import { OnboardingWizard } from './components/Onboarding/OnboardingWizard';
import { DashboardView } from './components/Dashboard/DashboardView';
import { CharacterView } from './components/Character/CharacterView';
import { FitnessView } from './components/Fitness/FitnessView';
import { NutritionView } from './components/Nutrition/NutritionView';
import { AetherVisionView } from './components/AetherVision/AetherVisionView';
import { ArmoryView } from './components/Armory/ArmoryView';
import { StoreView } from './components/Store/StoreView';
import { BuffsView } from './components/ActiveBuffs/BuffsView';
import { BossBattleView } from './components/BossBattle/BossBattleView';
import { StorylineView } from './components/Storyline/StorylineView';
import { SocialHubView } from './components/Social/SocialHubView';
import { PublicProfileModal } from './components/Social/PublicProfileModal';
import { GuildsView } from './components/Guilds/GuildsView';
import { ProgressionHubView } from './components/Progression/ProgressionHubView';
import { SettingsView } from './components/Settings/SettingsView';
import { HeroSelectionModal } from './components/HeroSelect/HeroSelectionModal';
import { InteractiveTutorialOverlay } from './components/Tutorial/InteractiveTutorialOverlay';
import { GlobalLegendUnlockModal } from './components/Achievements/GlobalLegendUnlockModal';
import { WorldExplorationView } from './components/world3d/heartlands/WorldExplorationView';

const MainAppContent: React.FC = () => {
  const {
    user,
    isAuthLoading,
    isAuthenticated,
    activeTab,
    showAuthModal,
    authMode,
    setShowAuthModal,
    showMigrationModal,
    migrationSummary,
    performMigration,
    skipMigration,
    showSupabaseConfigModal,
    setShowSupabaseConfigModal,
    recheckAuthSession,
    authCallbackError,
    clearAuthCallbackError,
    loginWithGoogleWithSupabase,
    selectedHeroId,
    heroLocked,
    showHeroSelectModal,
    setShowHeroSelectModal,
    selectPlayableHero,
  } = useGame();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 1. Loading gate while verifying existing Supabase session (prevents dashboard flash)
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#07050d] text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600/30 to-indigo-700/30 border border-purple-500/50 flex items-center justify-center shadow-lg shadow-purple-950/60">
            <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <h1 className="font-['Cinzel'] font-black tracking-widest text-xl text-slate-100">
              LIFEQUEST
            </h1>
            <p className="text-xs text-purple-300/80 mt-1 tracking-wide">
              Verifying Realm Session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Mandatory Authentication Gate for unauthenticated visitors
  if (!isAuthenticated || !user) {
    if (authCallbackError) {
      return (
        <AuthErrorScreen
          message={authCallbackError}
          onRetryGoogle={loginWithGoogleWithSupabase}
          onBackToLogin={() => {
            clearAuthCallbackError();
            setShowAuthModal(true, 'login');
          }}
        />
      );
    }

    return (
      <>
        <WelcomeLanding
          onStartJourney={() => setShowAuthModal(true, 'register')}
          onReturningPlayer={() => setShowAuthModal(true, 'login')}
        />
        <AuthModal
          isOpen={showAuthModal}
          initialMode={authMode}
          canClose={true}
          onClose={() => setShowAuthModal(false)}
          onSuccessRegister={() => {}}
        />
        {import.meta.env.DEV && showSupabaseConfigModal && (
          <SupabaseConfigModal
            isOpen={showSupabaseConfigModal}
            onClose={() => setShowSupabaseConfigModal(false)}
            onConfigUpdated={recheckAuthSession}
          />
        )}
      </>
    );
  }

  // 3. Onboarding wizard for new heroes
  if (!user.isOnboarded) {
    return <OnboardingWizard />;
  }

  // 4. Protected Private Routes (Dashboard & Realm Explorer)
  const renderCurrentView = () => {
    if (!isAuthenticated || !user) {
      return null;
    }
    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'progression':
      case 'quests':
      case 'daily-report':
      case 'achievements':
      case 'hall-of-legends':
        return <ProgressionHubView />;
      case 'character': return <CharacterView />;
      case 'fitness': return <FitnessView />;
      case 'nutrition': return <NutritionView />;
      case 'aether-vision': return <AetherVisionView />;
      case 'armory': return <ArmoryView />;
      case 'store': return <StoreView />;
      case 'buffs': return <BuffsView />;
      case 'boss-battles': return <BossBattleView />;
      case 'storyline': return <StorylineView />;
      case 'social':
      case 'leaderboard':
      case 'friends':
      case 'chat':
        return <SocialHubView />;
      case 'guilds': return <GuildsView />;
      case 'world': return <WorldExplorationView />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0914] text-[#D9D2C5] flex flex-col antialiased selection:bg-[#7046A5] selection:text-[#D9D2C5]">
      {/* Top Header */}
      <TopBar onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} />

      {/* Main Layout: Sidebar + Viewport */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <main
          className={`flex-1 min-w-0 overflow-y-auto ${
            activeTab === 'world' ? 'p-2 sm:p-3 lg:p-4' : 'p-4 sm:p-6 lg:p-8'
          }`}
        >
          {renderCurrentView()}
        </main>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        initialMode={authMode}
        onClose={() => setShowAuthModal(false)}
        onSuccessRegister={() => {}}
      />

      <DataMigrationModal
        isOpen={showMigrationModal}
        localSummary={migrationSummary}
        onMigrate={performMigration}
        onSkip={skipMigration}
      />

      {import.meta.env.DEV && showSupabaseConfigModal && (
        <SupabaseConfigModal
          isOpen={showSupabaseConfigModal}
          onClose={() => setShowSupabaseConfigModal(false)}
          onConfigUpdated={recheckAuthSession}
        />
      )}

      <PublicProfileModal />

      <HeroSelectionModal
        isOpen={showHeroSelectModal && !heroLocked}
        initialHeroId={selectedHeroId}
        heroLocked={heroLocked}
        canClose={false}
        onConfirm={selectPlayableHero}
        onClose={() => setShowHeroSelectModal(false)}
      />

      <InteractiveTutorialOverlay />
      <GlobalLegendUnlockModal />
    </div>
  );
};

export default function App() {
  return (
    <GameProvider>
      <MainAppContent />
    </GameProvider>
  );
}
