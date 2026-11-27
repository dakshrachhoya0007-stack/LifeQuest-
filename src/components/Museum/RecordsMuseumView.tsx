import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { recordsMuseumHallImg } from '../../assets/images';
import { MUSEUM_CATEGORY_META, MUSEUM_LOCKED_MILESTONES } from '../../data/ecosystemData';
import type { MuseumCategory, MuseumRarity, MuseumRecord } from '../../types/game';
import { GoldenWorldTreeEmblem } from '../Brand/GoldenWorldTreeEmblem';
import { syncMuseumPrivacyServer } from '../../services/ecosystemService';
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';

const RARITY_COLOR: Record<MuseumRarity, string> = {
  Common: 'text-[#94A8C7]',
  Rare: 'text-[#65A9FF]',
  Epic: 'text-[#00D9FF]',
  Legendary: 'text-[#FFD978]',
  Mythic: 'text-[#F05B70]',
};

export const RecordsMuseumView: React.FC = () => {
  const {
    user,
    museumData,
    museumLoading,
    refreshMuseumRecords,
    reconcileMuseum,
  } = useGame();

  const [category, setCategory] = useState<MuseumCategory | 'all'>('all');
  const [pbOnly, setPbOnly] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'rarity' | 'value'>('newest');
  const [page, setPage] = useState<number>(1);
  const [selectedRecord, setSelectedRecord] = useState<MuseumRecord | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    void refreshMuseumRecords({ category, pbOnly, search, sort, page });
  }, [category, pbOnly, sort, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void refreshMuseumRecords({ category, pbOnly, search, sort, page: 1 });
  };

  const handleReconcileMuseum = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncNotice(null);
    try {
      const res = await reconcileMuseum();
      if (res.ok) {
        setSyncNotice(
          res.reconciledCount && res.reconciledCount > 0
            ? `Enshrined ${res.reconciledCount} historical milestone records.`
            : 'Museum archive and personal bests are fully synchronized.'
        );
      } else {
        setSyncNotice('Could not synchronize historical records right now.');
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleMuseumPrivacy = async () => {
    if (!user?.id || syncing) return;
    setSyncing(true);
    try {
      const nextAllow = !(museumData?.allowPublic ?? true);
      await syncMuseumPrivacyServer(user.id, nextAllow);
      await refreshMuseumRecords({ category, pbOnly, search, sort, page });
    } finally {
      setSyncing(false);
    }
  };

  const records = museumData?.records || [];
  const personalBests = museumData?.personalBests || [];
  const counts = museumData?.categoryCounts || { all: 0 };
  const totalPages = museumData?.totalPages || 1;
  const totalRecords = museumData?.totalRecords || 0;
  const authoritativePbCount = museumData?.personalBestCount ?? personalBests.length;
  const authoritativeArchiveCount = museumData?.archiveCount ?? counts.all ?? 0;

  const archivedTitles = new Set(records.map(r => r.title.toLowerCase()));
  const unlockedPbTitles = new Set(personalBests.map(r => r.title.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* AAA Museum Exhibition Header */}
      <div className="relative rounded-2xl overflow-hidden border border-[#E7B94F]/35 bg-[#102440] shadow-[0_12px_32px_rgba(4,12,28,0.65)]">
        <div className="relative h-56 sm:h-64 overflow-hidden">
          <img
            src={recordsMuseumHallImg}
            alt="Personal Records Museum Hall"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center brightness-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#061225] via-[#0A1930]/75 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-start gap-3.5 max-w-2xl">
              <div className="w-11 h-11 rounded-xl bg-[#0A1930]/90 border border-[#FFD978]/50 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(231,185,79,0.25)]">
                <GoldenWorldTreeEmblem className="w-7 h-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#FFD978] font-semibold uppercase tracking-widest">
                  <span className="font-['Cinzel']">Permanent Archive</span>
                  <span className="text-[#94A8C7]/45" aria-hidden="true">·</span>
                  <span className="tabular-nums font-mono">{authoritativeArchiveCount} Enshrined Records</span>
                  <span className="text-[#94A8C7]/45" aria-hidden="true">·</span>
                  <span className="tabular-nums font-mono">{authoritativePbCount} Active Personal Bests</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2F7FF] mt-0.5">
                  PERSONAL RECORDS MUSEUM
                </h1>
                <p className="text-xs sm:text-sm text-[#94A8C7] mt-1">
                  Every verified workout milestone, skill breakthrough, boss victory, rivalry triumph, and Personal Best—preserved permanently in chronological order without erasing history.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={syncing}
                onClick={() => void handleToggleMuseumPrivacy()}
                className="px-3.5 py-2 rounded-xl bg-[#0A1930] hover:bg-[#152E52] border border-[#1677FF]/45 hover:border-[#00D9FF]/55 text-xs font-semibold text-[#F2F7FF] flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              >
                {museumData?.allowPublic === false || user?.privacySettings?.personalRecords === 'nobody' ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-[#00D9FF]" />
                    Museum Hidden
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-[#35D69A]" />
                    Showcase Public
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={syncing || museumLoading}
                onClick={() => void handleReconcileMuseum()}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#E7B94F] to-[#FFAA45] hover:from-[#FFD978] hover:to-[#FFAA45] text-[#061225] shadow-[0_0_16px_rgba(231,185,79,0.35)] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                Sync History
              </button>
            </div>
          </div>
        </div>
      </div>

      {syncNotice && (
        <div className="rounded-xl bg-[#35D69A]/10 border border-[#35D69A]/45 px-4 py-2.5 text-xs text-[#35D69A] flex items-center justify-between gap-2">
          <span>{syncNotice}</span>
          <button
            type="button"
            onClick={() => setSyncNotice(null)}
            className="text-[#35D69A]/80 hover:text-[#F2F7FF]"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Personal Best Trophy Showcase */}
      <div className="rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#E7B94F]/30 shadow-[0_12px_32px_rgba(4,12,28,0.65)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#FFD978]" />
            Active Personal Best Trophy Case
          </h2>
          <span className="text-[11px] text-[#94A8C7]">
            Previous PBs remain preserved in the archive below
          </span>
        </div>

        {personalBests.length === 0 ? (
          <p className="text-xs text-[#94A8C7] py-4">
            Complete verified workouts, streak milestones, or raid strikes to enshrine your first Personal Best trophy.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {personalBests.slice(0, 8).map(pb => (
              <button
                key={pb.id}
                type="button"
                onClick={() => setSelectedRecord(pb)}
                className="text-left rounded-xl bg-gradient-to-br from-[#102440] to-[#0A1930] border border-[#E7B94F]/35 hover:border-[#FFD978]/70 p-4 transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-[#FFD978]">Personal Best</span>
                  <span className={RARITY_COLOR[pb.rarity]}>{pb.rarity}</span>
                </div>
                <p className="text-sm font-bold text-[#F2F7FF] truncate">{pb.title}</p>
                <p className="text-xl font-black font-mono text-[#FFD978] tabular-nums">
                  {pb.displayValue}
                </p>
                <p className="text-[10px] text-[#94A8C7]">
                  {new Date(pb.achievedAt).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Tabs + Search & Sort Controls */}
      <div className="rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/35 shadow-[0_12px_32px_rgba(4,12,28,0.65)] p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#94A8C7]/70 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search museum records..."
                className="w-full rounded-xl bg-[#0A1930] border border-[#1677FF]/40 pl-9 pr-3 py-2 text-xs text-[#F2F7FF] placeholder-[#94A8C7]/60 focus:outline-none focus:border-[#FFD978]"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#0099FF] hover:to-[#38D9F5] text-[#F2F7FF] shadow-[0_0_12px_rgba(22,119,255,0.35)] text-xs font-semibold transition-all"
            >
              Filter
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-[#061225] rounded-xl border border-[#1677FF]/30">
              <button
                type="button"
                onClick={() => {
                  setPbOnly(false);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  !pbOnly
                    ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] text-[#F2F7FF]'
                    : 'text-[#94A8C7] hover:text-[#F2F7FF]'
                }`}
              >
                Full History Archive
              </button>
              <button
                type="button"
                onClick={() => {
                  setPbOnly(true);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  pbOnly
                    ? 'bg-gradient-to-r from-[#E7B94F] to-[#FFAA45] text-[#061225] font-bold'
                    : 'text-[#94A8C7] hover:text-[#F2F7FF]'
                }`}
              >
                Active PBs Only ({authoritativePbCount})
              </button>
            </div>
            <label className="text-xs text-[#94A8C7]">Sort:</label>
            <select
              value={sort}
              onChange={e => {
                setSort(e.target.value as any);
                setPage(1);
              }}
              className="rounded-xl bg-[#0A1930] border border-[#1677FF]/40 px-3 py-2 text-xs text-[#F2F7FF] focus:outline-none focus:border-[#FFD978]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="rarity">Highest Rarity</option>
              <option value="value">Highest Value</option>
            </select>
          </div>
        </div>

        {/* All 10 Category Filter Buttons */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setCategory('all');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              category === 'all'
                ? 'bg-gradient-to-r from-[#E7B94F] to-[#FFAA45] text-[#061225] font-bold shadow-[0_0_12px_rgba(231,185,79,0.3)]'
                : 'bg-[#0A1930] text-[#94A8C7] hover:text-[#F2F7FF] border border-[#1677FF]/30 hover:border-[#00D9FF]/50'
            }`}
          >
            All ({counts.all || 0})
          </button>
          {(Object.keys(MUSEUM_CATEGORY_META) as MuseumCategory[]).map(catKey => (
            <button
              key={catKey}
              type="button"
              onClick={() => {
                setCategory(catKey);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                category === catKey
                  ? 'bg-gradient-to-r from-[#E7B94F] to-[#FFAA45] text-[#061225] font-bold shadow-[0_0_12px_rgba(231,185,79,0.3)]'
                  : 'bg-[#0A1930] text-[#94A8C7] hover:text-[#F2F7FF] border border-[#1677FF]/30 hover:border-[#00D9FF]/50'
              }`}
            >
              {MUSEUM_CATEGORY_META[catKey].label} ({counts[catKey] || 0})
            </button>
          ))}
        </div>

        {/* Exhibition Grid */}
        {museumLoading ? (
          <div className="py-10 text-center text-xs text-[#94A8C7]">Loading museum exhibits...</div>
        ) : records.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#94A8C7]">
            No archived records match this filter yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {records.map(rec => (
              <button
                key={rec.id}
                type="button"
                onClick={() => setSelectedRecord(rec)}
                className={`text-left rounded-xl p-4 border transition-colors space-y-2 ${
                  rec.isPersonalBest
                    ? 'bg-[#0A1930] border-[#FFD978]/55 hover:border-[#FFD978] shadow-[0_0_16px_rgba(231,185,79,0.14)]'
                    : 'bg-[#0A1930]/85 border-[#1677FF]/30 hover:border-[#00D9FF]/55'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-[#00D9FF]">
                    {MUSEUM_CATEGORY_META[rec.category]?.label || rec.category}
                  </span>
                  <span className={`font-bold ${RARITY_COLOR[rec.rarity]}`}>
                    {rec.rarity}
                  </span>
                </div>
                <p className="text-sm font-bold text-[#F2F7FF]">{rec.title}</p>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-lg font-black font-mono text-[#F2F7FF] tabular-nums">
                    {rec.displayValue}
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      rec.isPersonalBest ? 'text-[#FFD978]' : 'text-[#94A8C7]/75'
                    }`}
                  >
                    {rec.isPersonalBest ? 'Active Personal Best' : 'Historical Record'}
                  </span>
                </div>
                <p className="text-[11px] text-[#94A8C7] line-clamp-2">{rec.description}</p>
                <div className="pt-1 border-t border-[#1677FF]/25 flex items-center justify-between text-[10px] text-[#94A8C7]/75">
                  <span className="flex items-center gap-1 text-[#35D69A]">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                  <span className="tabular-nums">
                    {new Date(rec.achievedAt).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalRecords > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-[#1677FF]/25 text-xs text-[#94A8C7]">
            <span className="tabular-nums">Showing page {page} of {totalPages} ({totalRecords} total)</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-[#0A1930] border border-[#1677FF]/35 hover:border-[#00D9FF]/55 text-[#F2F7FF] disabled:opacity-35 transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-[#0A1930] border border-[#1677FF]/35 hover:border-[#00D9FF]/55 text-[#F2F7FF] disabled:opacity-35 transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Locked Milestone Previews */}
      <div className="rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/35 shadow-[0_12px_32px_rgba(4,12,28,0.65)] p-5 space-y-4">
        <h2 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#FFD978]" />
          Locked Milestone Exhibits Preview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {MUSEUM_LOCKED_MILESTONES.map(m => {
            const isUnlocked =
              archivedTitles.has(m.title.toLowerCase()) ||
              unlockedPbTitles.has(m.title.toLowerCase());
            return (
              <div
                key={m.id}
                className={`rounded-xl p-3.5 border space-y-1.5 ${
                  isUnlocked
                    ? 'bg-[#35D69A]/10 border-[#35D69A]/40'
                    : 'bg-[#0A1930] border-[#1677FF]/30 opacity-85'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                  <span className={RARITY_COLOR[m.rarity]}>{m.rarity}</span>
                  <span className={isUnlocked ? 'text-[#35D69A]' : 'text-[#94A8C7]/70'}>
                    {isUnlocked ? 'Enshrined' : 'Locked'}
                  </span>
                </div>
                <p className="text-xs font-bold text-[#F2F7FF]">{m.title}</p>
                <p className="text-[11px] text-[#94A8C7]">{m.requirementText}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-[#061225]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-[#102440] border border-[#E7B94F]/50 p-6 space-y-4 shadow-[0_20px_50px_rgba(4,12,28,0.88)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#FFD978]">
                  {MUSEUM_CATEGORY_META[selectedRecord.category]?.label} · {selectedRecord.rarity}
                </p>
                <h3 className="text-lg font-['Cinzel'] font-bold text-[#F2F7FF] mt-0.5">
                  {selectedRecord.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg bg-[#0A1930] border border-[#1677FF]/35 text-[#94A8C7] hover:text-[#F2F7FF]"
                aria-label="Close record details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[#0A1930] border border-[#1677FF]/35 p-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[#94A8C7]">Recorded Value</span>
                <span className="text-2xl font-black font-mono text-[#FFD978] tabular-nums">
                  {selectedRecord.displayValue}
                </span>
              </div>
              <p className="text-xs text-[#94A8C7]">{selectedRecord.description}</p>
            </div>

            <div className="space-y-1.5 text-xs text-[#94A8C7]">
              <div className="flex justify-between">
                <span>Archive Status</span>
                <span className="font-semibold text-[#F2F7FF]">
                  {selectedRecord.isPersonalBest ? 'Current Personal Best' : 'Preserved Historical Record'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Verification</span>
                <span className="text-[#35D69A] font-semibold">Server-Verified Activity</span>
              </div>
              <div className="flex justify-between">
                <span>Source Reference</span>
                <span className="font-mono text-[11px]">{selectedRecord.sourceActivityRef}</span>
              </div>
              <div className="flex justify-between">
                <span>Achieved On</span>
                <span className="tabular-nums">
                  {new Date(selectedRecord.achievedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
