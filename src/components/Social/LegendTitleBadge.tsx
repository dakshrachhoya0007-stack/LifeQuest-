import React from 'react';
import {
  Activity,
  Apple,
  Award,
  BookOpen,
  Coins,
  Compass,
  Crown,
  Droplets,
  Dumbbell,
  Eye,
  Flame,
  Gem,
  GraduationCap,
  Heart,
  HeartHandshake,
  Library,
  Lightbulb,
  Map as MapIcon,
  MessageSquare,
  Moon,
  ScrollText,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Trophy,
  Users,
  Wind,
  Zap,
} from 'lucide-react';
import { GlobalTitleStyle } from '../../types/game';
import { TITLE_STYLE_META } from '../../data/globalLegendsData';

export const LegendEmblemIcon: React.FC<{
  iconName?: string | null;
  className?: string;
}> = ({ iconName, className = 'w-4 h-4' }) => {
  switch (iconName) {
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    case 'Flame':
      return <Flame className={className} />;
    case 'Compass':
      return <Compass className={className} />;
    case 'Crown':
      return <Crown className={className} />;
    case 'Swords':
      return <Dumbbell className={className} />;
    case 'Gem':
      return <Gem className={className} />;
    case 'BookOpen':
      return <BookOpen className={className} />;
    case 'GraduationCap':
      return <GraduationCap className={className} />;
    case 'ScrollText':
      return <ScrollText className={className} />;
    case 'Lightbulb':
      return <Lightbulb className={className} />;
    case 'Eye':
      return <Eye className={className} />;
    case 'Library':
      return <Library className={className} />;
    case 'Dumbbell':
      return <Dumbbell className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Activity':
      return <Activity className={className} />;
    case 'Shield':
      return <Shield className={className} />;
    case 'Trophy':
      return <Trophy className={className} />;
    case 'Wind':
      return <Wind className={className} />;
    case 'Sun':
      return <Sun className={className} />;
    case 'Moon':
      return <Moon className={className} />;
    case 'Droplets':
      return <Droplets className={className} />;
    case 'Apple':
      return <Apple className={className} />;
    case 'Heart':
      return <Heart className={className} />;
    case 'Award':
      return <Award className={className} />;
    case 'Map':
      return <MapIcon className={className} />;
    case 'Hammer':
      return <Award className={className} />;
    case 'Users':
      return <Users className={className} />;
    case 'HeartHandshake':
      return <HeartHandshake className={className} />;
    case 'MessageSquare':
      return <MessageSquare className={className} />;
    case 'Star':
      return <Star className={className} />;
    case 'Coins':
      return <Coins className={className} />;
    case 'Sparkles':
    default:
      return <Sparkles className={className} />;
  }
};

interface LegendTitleBadgeProps {
  title?: string | null;
  style?: GlobalTitleStyle | null;
  emblemIcon?: string | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const LegendTitleBadge: React.FC<LegendTitleBadgeProps> = ({
  title,
  style = 'gold',
  emblemIcon = 'Crown',
  size = 'sm',
  className = '',
}) => {
  if (!title) return null;
  const meta = TITLE_STYLE_META[style || 'gold'] || TITLE_STYLE_META.gold;

  const sizeClasses =
    size === 'xs'
      ? 'px-1.5 py-0.5 text-[9px] gap-1'
      : size === 'md'
      ? 'px-2.5 py-1 text-[11px] gap-1.5'
      : 'px-2 py-0.5 text-[10px] gap-1';

  const iconSize = size === 'xs' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3';

  return (
    <span
      title={`Worldwide One-of-One Exclusive Title: [${title}]`}
      className={`inline-flex items-center rounded border font-['Cinzel'] font-bold tracking-wider uppercase whitespace-nowrap shrink-0 ${meta.badgeBg} ${meta.badgeBorder} ${meta.badgeText} ${meta.glowShadow} ${sizeClasses} ${className}`}
    >
      <LegendEmblemIcon iconName={emblemIcon} className={`${iconSize} shrink-0`} />
      <span>[{title}]</span>
    </span>
  );
};
