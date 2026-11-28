import React, { useEffect, useState } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { applyFeatureThemeToDocument, resolveFeatureTheme } from './theme/featureTheme';
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
import { HallOfLegendsView } from './components/Achievements/HallOfLegendsView';
import { SettingsView } from './components/Settings/SettingsView';
import { HeroSelectionModal } from './components/HeroSelect/HeroSelectionModal';
import { InteractiveTutorialOverlay } from './components/Tutorial/InteractiveTutorialOverlay';
import { GlobalLegendUnlockModal } from './components/Achievements/GlobalLegendUnlockModal';
import { RivalsView } from './components/Social/RivalsView';
import { AiMentorView } from './components/Mentor/AiMentorView';
import { CommunityEventsView } from './components/Events/CommunityEventsView';
import { RecordsMuseumView } from './components/Museum/RecordsMuseumView';
import { NotificationCenterView } from './components/Notifications/NotificationCenterView';
import {
  AetheriaAtmosphericBackdrop,
  RpgPageTransition,
} from './components/Motion/RpgMotionPrimitives';
import { GoldenWorldTreeEmblem } from './components/Brand/GoldenWorldTreeEmblem';

const MainAppContent: React.FC = () => {
  const {
    user,
    isAuthLoading,
    isAuthenticated,
    activeTab,
    progressionSubTab,
    socialSubTab,
    characterSubTab,
    storeSubTab,
    eventsSubTab,
    guildsSubTab,
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

  const activeFeatureTheme = resolveFeatureTheme({
    activeTab,
    progressionSubTab,
    socialSubTab,
    characterSubTab,
    storeSubTab,
    eventsSubTab,
    guildsSubTab,
  });

  useEffect(() => {
    applyFeatureThemeToDocument(activeFeatureTheme);
  }, [activeFeatureTheme]);

  // 1. Loading gate while verifying existing Supabase session
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#061225] text-[#F2F7FF] flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#0A1930] border border-[#00D9FF]/45 flex items-center justify-center shadow-[0_14px_34px_rgba(2,8,20,0.88)]">
            <GoldenWorldTreeEmblem className="w-10 h-10 animate-ascendant-pulse" />
          </div>
          <div>
            <h1 className="font-['Cinzel'] font-black tracking-[0.22em] text-xl text-[#00D9FF]">
              FITNESSFIGHT
            </h1>
            <p className="text-xs text-[#94A8C7] mt-1.5 tracking-wide">
              Entering the Citadel of Aetheria...
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
      case 'dashboard':
        return <DashboardView />;
      case 'progression':
      case 'quests':
      case 'achievements':
      case 'skill-tree':
      case 'daily-calendar':
        return <ProgressionHubView />;
      case 'hall-of-legends':
        return <HallOfLegendsView />;
      case 'character':
      case 'customization':
      case 'cards':
      case 'trophies':
        return <CharacterView />;
      case 'fitness':
        return <FitnessView />;
      case 'nutrition':
        return <NutritionView />;
      case 'aether-vision':
        return <AetherVisionView />;
      case 'store':
      case 'marketplace':
        return <StoreView />;
      case 'boss-battles':
        return <BossBattleView />;
      case 'storyline':
        return <StorylineView />;
      case 'seasons':
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
      case 'mentor':
        return <AiMentorView />;
      case 'events':
      case 'decisions':
        return <CommunityEventsView />;
      case 'museum':
        return <RecordsMuseumView />;
      case 'guilds':
      case 'territory-wars':
        return <GuildsView />;
      case 'notifications':
        return <NotificationCenterView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="relative min-h-screen bg-[#061225] text-[#F2F7FF] flex flex-col antialiased selection:bg-[#1677FF] selection:text-[#F2F7FF]">
      <AetheriaAtmosphericBackdrop
        primaryRgb={activeFeatureTheme.primaryRgb}
        secondaryRgb={activeFeatureTheme.secondaryRgb}
      />

      {/* Top Header */}
      <TopBar onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} />

      {/* Main Layout: Sidebar + Viewport */}
      <div className="relative z-10 flex-1 max-w-[1440px] w-full mx-auto flex">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <RpgPageTransition routeKey={activeTab}>
            {renderCurrentView()}
          </RpgPageTransition>
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
