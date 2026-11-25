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
import { StoreView } from './components/Store/StoreView';
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
import { RivalsView } from './components/Social/RivalsView';
import { AiMentorView } from './components/Mentor/AiMentorView';
import { CommunityEventsView } from './components/Events/CommunityEventsView';
import { RecordsMuseumView } from './components/Museum/RecordsMuseumView';
import { NotificationCenterView } from './components/Notifications/NotificationCenterView';

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
      <div className="min-h-screen bg-[#061225] text-[#FFFFFF] flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1677FF]/25 to-[#00D9FF]/15 border border-[#00D9FF]/45 flex items-center justify-center shadow-[0_0_28px_rgba(22,119,255,0.28)]">
            <div className="w-6 h-6 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <h1 className="font-['Cinzel'] font-black tracking-widest text-xl text-[#FFFFFF]">
              LIFEQUEST
            </h1>
            <p className="text-xs text-[#A9B8CC] mt-1 tracking-wide">
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
      case 'skill-tree':
      case 'seasons':
      case 'daily-calendar':
        return <ProgressionHubView />;
      case 'character':
      case 'customization':
      case 'cards':
      case 'trophies':
        return <CharacterView />;
      case 'fitness': return <FitnessView />;
      case 'nutrition': return <NutritionView />;
      case 'aether-vision': return <AetherVisionView />;
      case 'store':
      case 'marketplace':
        return <StoreView />;
      case 'boss-battles': return <BossBattleView />;
      case 'storyline': return <StorylineView />;
      case 'social':
      case 'leaderboard':
      case 'friends':
      case 'chat':
      case 'activity-feed':
      case 'workout-parties':
      case 'friendships':
        return <SocialHubView />;
      case 'rivals':
        return <RivalsView />;
      case 'mentor': return <AiMentorView />;
      case 'events':
      case 'decisions':
        return <CommunityEventsView />;
      case 'museum': return <RecordsMuseumView />;
      case 'guilds':
      case 'territory-wars':
        return <GuildsView />;
      case 'notifications': return <NotificationCenterView />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div
      className="min-h-screen bg-[#061225] text-[#FFFFFF] flex flex-col antialiased selection:bg-[#1677FF] selection:text-white"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 85% 45% at 50% -10%, rgba(22, 119, 255, 0.14), transparent 70%), radial-gradient(ellipse 60% 35% at 85% 15%, rgba(0, 217, 255, 0.06), transparent 65%)',
      }}
    >
      {/* Top Header */}
      <TopBar onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} />

      {/* Main Layout: Sidebar + Viewport */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
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
