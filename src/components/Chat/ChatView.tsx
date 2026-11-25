import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getRpgAvatarForClass } from '../../assets/images';
import { PresenceBadge } from '../Brand/PresenceBadge';
import {
  MessageSquare,
  Send,
  Flag,
  Crown,
} from 'lucide-react';
import { LegendTitleBadge } from '../Social/LegendTitleBadge';

export const ChatView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const {
    chatMessages,
    sendChatMessage,
    reportChatMessage,
    guilds,
    friends,
    openPublicProfile,
    setActiveTab,
    setProgressionSubTab,
    equippedLegendMap,
    legendAnnouncements,
    getPlayerPresence,
    queryPresencesBatch,
  } = useGame();
  const [selectedChannel, setSelectedChannel] = useState<'guild' | 'general' | 'whisper'>('general');
  const [inputText, setInputText] = useState('');
  const [whisperRecipientId, setWhisperRecipientId] = useState<string>('');
  const [notice, setNotice] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  const myGuild = guilds.find(g => g.isMember);
  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const filteredMessages = chatMessages.filter(m => m.channel === selectedChannel);

  useEffect(() => {
    const ids = new Set<string>();
    filteredMessages.forEach(m => m.senderId && ids.add(m.senderId));
    acceptedFriends.forEach(f => ids.add(f.champion.id));
    if (ids.size > 0) {
      void queryPresencesBatch(Array.from(ids));
    }
  }, [filteredMessages.length, acceptedFriends.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const recipient = selectedChannel === 'whisper' ? (whisperRecipientId || acceptedFriends[0]?.champion.id) : undefined;
    const res = await sendChatMessage(selectedChannel, inputText, recipient);
    if (!res.success && res.error) {
      setNotice({ type: 'error', text: res.error });
      setTimeout(() => setNotice(null), 3500);
    } else {
      setInputText('');
    }
  };

  const handleReport = async (id: string) => {
    await reportChatMessage(id);
    setNotice({
      type: 'info',
      text: 'Message reported to Realm Sentinels for review. Thank you for maintaining a safe fellowship.',
    });
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Banner / Channel Toolbar */}
      {embedded ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 rounded-2xl p-4 shadow-[0_12px_32px_rgba(2,8,20,0.6)]">
          <div>
            <h2 className="font-['Cinzel'] font-bold text-base text-white">
              Realm Chat &amp; Messages
            </h2>
            <p className="text-xs text-[#A9B8CC] mt-0.5">
              Coordinate guild raids, celebrate milestones, and whisper companions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#061225] rounded-xl border border-[#1677FF]/25">
            <button
              onClick={() => setSelectedChannel('guild')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                selectedChannel === 'guild' ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] text-white shadow-[0_0_12px_rgba(22,119,255,0.3)]' : 'text-[#A9B8CC] hover:text-white'
              }`}
            >
              Guild Chat
            </button>
            <button
              onClick={() => setSelectedChannel('general')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                selectedChannel === 'general' ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] text-white shadow-[0_0_12px_rgba(22,119,255,0.3)]' : 'text-[#A9B8CC] hover:text-white'
              }`}
            >
              General Tavern
            </button>
            <button
              onClick={() => setSelectedChannel('whisper')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                selectedChannel === 'whisper' ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] text-white shadow-[0_0_12px_rgba(22,119,255,0.3)]' : 'text-[#A9B8CC] hover:text-white'
              }`}
            >
              Whispers
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 p-6 shadow-[0_12px_32px_rgba(2,8,20,0.6)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-[#00D9FF]">
                  Tavern of Fellowship
                </span>
                <span className="text-[#A9B8CC]/40">·</span>
                <span className="text-xs text-[#A9B8CC] font-semibold">Real-Time Web & Mobile Channels</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
                REALM CHAT & MESSAGES
              </h1>
              <p className="text-xs sm:text-sm text-[#A9B8CC] max-w-2xl mt-1">
                Coordinate guild raids, celebrate workout milestones, and share healthy culinary tips across Aetheria.
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-[#061225] rounded-xl border border-[#1677FF]/25">
              <button
                onClick={() => setSelectedChannel('guild')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  selectedChannel === 'guild' ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] text-white shadow-[0_0_12px_rgba(22,119,255,0.3)]' : 'text-[#A9B8CC] hover:text-white'
                }`}
              >
                Guild Chat
              </button>
              <button
                onClick={() => setSelectedChannel('general')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  selectedChannel === 'general' ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] text-white shadow-[0_0_12px_rgba(22,119,255,0.3)]' : 'text-[#A9B8CC] hover:text-white'
                }`}
              >
                General Tavern
              </button>
              <button
                onClick={() => setSelectedChannel('whisper')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  selectedChannel === 'whisper' ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] text-white shadow-[0_0_12px_rgba(22,119,255,0.3)]' : 'text-[#A9B8CC] hover:text-white'
                }`}
              >
                Whispers
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div
          className={`p-3 rounded-xl border text-xs text-center animate-in fade-in ${
            notice.type === 'error'
              ? 'bg-rose-950/80 border-rose-700 text-rose-200'
              : 'bg-[#0A1930] border-[#00D9FF]/50 text-[#00D9FF]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Chat Window */}
      <div className="bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 rounded-2xl overflow-hidden shadow-[0_12px_32px_rgba(2,8,20,0.6)] flex flex-col h-[520px]">
        {/* Chat Header */}
        <div className="px-6 py-3.5 border-b border-[#1677FF]/25 bg-[#0A1930] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#00D9FF]" />
            <span className="text-xs font-bold font-['Cinzel'] text-white uppercase tracking-wider">
              {selectedChannel === 'guild'
                ? myGuild
                  ? `${myGuild.name} Channel`
                  : 'Guild Channel (Join a guild to chat)'
                : selectedChannel === 'general'
                ? 'Aetheria Central Tavern'
                : 'Private Direct Whispers'}
            </span>
          </div>

          {selectedChannel === 'whisper' && acceptedFriends.length > 0 && (
            <select
              value={whisperRecipientId || acceptedFriends[0]?.champion.id}
              onChange={e => setWhisperRecipientId(e.target.value)}
              className="bg-[#061225] border border-[#1677FF]/40 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-[#00D9FF]"
            >
              {acceptedFriends.map(f => (
                <option key={f.champion.id} value={f.champion.id}>
                  Whisper: {f.champion.username}
                </option>
              ))}
            </select>
          )}

          <span className="text-[11px] text-[#A9B8CC] font-mono tabular-nums">
            {filteredMessages.length} Messages
          </span>
        </div>

        {legendAnnouncements.length > 0 && (
          <div className="px-6 py-2 bg-[#061225]/90 border-b border-[#1677FF]/25 flex items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center gap-2 min-w-0">
              <Crown className="w-3.5 h-3.5 text-[#00D9FF] shrink-0" />
              <span className="text-[#A9B8CC] truncate">
                <span className="font-semibold text-[#00D9FF]">Realm Herald:</span>{' '}
                {legendAnnouncements[0].ownerUsername} became the sole worldwide bearer of [{legendAnnouncements[0].titleTag}] ({legendAnnouncements[0].achievementName})
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setProgressionSubTab('hall-of-legends');
                setActiveTab('progression');
              }}
              className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#00D9FF] hover:text-white whitespace-nowrap shrink-0 transition-colors"
            >
              Hall of Legends →
            </button>
          </div>
        )}

        {/* Message Log */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#061225]/55">
          {filteredMessages.length === 0 ? (
            <div className="text-xs text-[#A9B8CC] text-center py-12">
              {selectedChannel === 'whisper' && acceptedFriends.length === 0 ? (
                <span>
                  Add a companion in{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('friends')}
                    className="text-[#00D9FF] hover:text-white underline font-semibold transition-colors"
                  >
                    Discover &amp; Friends
                  </button>{' '}
                  first to send private whispers.
                </span>
              ) : (
                <span>No messages in this channel yet. Start the fellowship conversation below!</span>
              )}
            </div>
          ) : (
            filteredMessages.map(msg => {
              const avatarSrc = getRpgAvatarForClass(msg.senderClass);
              const canInspect = Boolean(msg.senderId);

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${msg.isCurrentUser ? 'flex-row-reverse' : ''}`}
                >
                  <button
                    type="button"
                    disabled={!canInspect}
                    onClick={() => msg.senderId && openPublicProfile(msg.senderId)}
                    className={`shrink-0 ${canInspect ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
                    title={canInspect ? `View ${msg.senderName}'s profile` : undefined}
                  >
                    <img
                      src={avatarSrc}
                      alt={msg.senderName}
                      className="w-9 h-9 rounded-full object-cover object-top border border-[#1677FF]/60"
                    />
                  </button>

                  <div className={`max-w-md ${msg.isCurrentUser ? 'text-right' : 'text-left'}`}>
                    <div
                      className={`flex flex-wrap items-center gap-1.5 mb-1 ${
                        msg.isCurrentUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {msg.senderId && !getPlayerPresence(msg.senderId).hidden && (
                        <PresenceBadge
                          status={msg.senderPresenceStatus || getPlayerPresence(msg.senderId).status}
                          size="xs"
                        />
                      )}
                      <button
                        type="button"
                        disabled={!canInspect}
                        onClick={() => msg.senderId && openPublicProfile(msg.senderId)}
                        className={`text-xs font-bold text-white ${
                          canInspect ? 'hover:text-[#00D9FF] transition-colors cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        {msg.senderName}
                      </button>
                      <LegendTitleBadge
                        title={
                          msg.senderLegendTitle ||
                          (msg.senderId ? equippedLegendMap[msg.senderId]?.titleTag : undefined)
                        }
                        style={
                          msg.senderLegendStyle ||
                          (msg.senderId ? equippedLegendMap[msg.senderId]?.titleStyle : undefined)
                        }
                        emblemIcon={
                          msg.senderLegendEmblem ||
                          (msg.senderId ? equippedLegendMap[msg.senderId]?.emblemIcon : undefined)
                        }
                        size="xs"
                      />
                      <span className="text-[10px] text-[#00D9FF] uppercase font-mono font-medium">
                        {msg.senderClass}
                      </span>
                      <span className="text-[10px] text-[#A9B8CC]/65 font-mono tabular-nums">{msg.timestamp}</span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed inline-block group relative text-left ${
                        msg.isCurrentUser
                          ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] text-white rounded-tr-none shadow-[0_4px_16px_rgba(22,119,255,0.25)]'
                          : 'bg-[#0A1930] border border-[#1677FF]/30 text-white rounded-tl-none'
                      }`}
                    >
                      <p>{msg.text}</p>
                      {!msg.isCurrentUser && (
                        <button
                          onClick={() => handleReport(msg.id)}
                          className="opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 p-1 bg-[#061225] text-[#A9B8CC] hover:text-rose-400 rounded-full border border-[#1677FF]/35 transition-opacity"
                          title="Report message"
                        >
                          <Flag className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-[#1677FF]/25 bg-[#0A1930] flex items-center gap-3">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={`Message ${selectedChannel === 'guild' ? 'fellow guildmates' : selectedChannel === 'whisper' ? 'selected friend' : 'the realm'}...`}
            className="flex-1 bg-[#061225] border border-[#1677FF]/35 rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#A9B8CC]/50 focus:outline-none focus:border-[#00D9FF]"
          />

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white text-xs font-bold font-['Cinzel'] tracking-wider shadow-[0_0_16px_rgba(22,119,255,0.35)] flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
