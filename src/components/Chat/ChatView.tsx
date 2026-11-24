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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141420]/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
          <div>
            <h2 className="font-['Cinzel'] font-bold text-base text-white">
              Realm Chat &amp; Messages
            </h2>
            <p className="text-xs text-[#A1A1B8] mt-0.5">
              Coordinate guild raids, celebrate milestones, and whisper companions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#090910] rounded-xl border border-white/10">
            <button
              onClick={() => setSelectedChannel('guild')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                selectedChannel === 'guild' ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white shadow-[0_0_12px_rgba(139,92,246,0.35)]' : 'text-[#A1A1B8] hover:text-white'
              }`}
            >
              Guild Chat
            </button>
            <button
              onClick={() => setSelectedChannel('general')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                selectedChannel === 'general' ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white shadow-[0_0_12px_rgba(139,92,246,0.35)]' : 'text-[#A1A1B8] hover:text-white'
              }`}
            >
              General Tavern
            </button>
            <button
              onClick={() => setSelectedChannel('whisper')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                selectedChannel === 'whisper' ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white shadow-[0_0_12px_rgba(139,92,246,0.35)]' : 'text-[#A1A1B8] hover:text-white'
              }`}
            >
              Whispers
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#141420]/95 backdrop-blur-md border border-white/10 p-6 shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-[#D6A84B]">
                  Tavern of Fellowship
                </span>
                <span className="text-[#A1A1B8]/40">·</span>
                <span className="text-xs text-[#A1A1B8] font-semibold">Real-Time Web &amp; Mobile Channels</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
                REALM CHAT &amp; MESSAGES
              </h1>
              <p className="text-xs sm:text-sm text-[#A1A1B8] max-w-2xl mt-1">
                Coordinate guild raids, celebrate workout milestones, and share healthy culinary tips across Aetheria.
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-[#090910] rounded-xl border border-white/10">
              <button
                onClick={() => setSelectedChannel('guild')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  selectedChannel === 'guild' ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white shadow-[0_0_12px_rgba(139,92,246,0.35)]' : 'text-[#A1A1B8] hover:text-white'
                }`}
              >
                Guild Chat
              </button>
              <button
                onClick={() => setSelectedChannel('general')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  selectedChannel === 'general' ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white shadow-[0_0_12px_rgba(139,92,246,0.35)]' : 'text-[#A1A1B8] hover:text-white'
                }`}
              >
                General Tavern
              </button>
              <button
                onClick={() => setSelectedChannel('whisper')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  selectedChannel === 'whisper' ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white shadow-[0_0_12px_rgba(139,92,246,0.35)]' : 'text-[#A1A1B8] hover:text-white'
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
              ? 'bg-[#FB7185]/10 border-[#FB7185]/40 text-[#FB7185]'
              : 'bg-[#0E0E17] border-[#8B5CF6]/50 text-[#D6A84B]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Chat Window */}
      <div className="bg-[#141420]/95 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.6)] flex flex-col h-[520px]">
        {/* Chat Header */}
        <div className="px-6 py-3.5 border-b border-white/10 bg-[#0E0E17] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#8B5CF6]" />
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
              className="bg-[#090910] border border-white/15 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-[#8B5CF6]"
            >
              {acceptedFriends.map(f => (
                <option key={f.champion.id} value={f.champion.id}>
                  Whisper: {f.champion.username}
                </option>
              ))}
            </select>
          )}

          <span className="text-[11px] text-[#A1A1B8] font-mono tabular-nums">
            {filteredMessages.length} Messages
          </span>
        </div>

        {legendAnnouncements.length > 0 && (
          <div className="px-6 py-2 bg-[#090910]/90 border-b border-white/10 flex items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center gap-2 min-w-0">
              <Crown className="w-3.5 h-3.5 text-[#D6A84B] shrink-0" />
              <span className="text-[#A1A1B8] truncate">
                <span className="font-semibold text-[#D6A84B]">Realm Herald:</span>{' '}
                {legendAnnouncements[0].ownerUsername} became the sole worldwide bearer of [{legendAnnouncements[0].titleTag}] ({legendAnnouncements[0].achievementName})
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setProgressionSubTab('hall-of-legends');
                setActiveTab('progression');
              }}
              className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#D6A84B] hover:text-white whitespace-nowrap shrink-0 transition-colors"
            >
              Hall of Legends →
            </button>
          </div>
        )}

        {/* Message Log */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#090910]/60">
          {filteredMessages.length === 0 ? (
            <div className="text-xs text-[#A1A1B8] text-center py-12">
              {selectedChannel === 'whisper' && acceptedFriends.length === 0 ? (
                <span>
                  Add a companion in{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('friends')}
                    className="text-[#D6A84B] hover:text-white underline font-semibold transition-colors"
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
                      className="w-9 h-9 rounded-full object-cover object-top border border-[#8B5CF6]/55"
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
                          canInspect ? 'hover:text-[#D6A84B] transition-colors cursor-pointer' : 'cursor-default'
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
                      <span className="text-[10px] text-[#D6A84B] uppercase font-mono font-medium">
                        {msg.senderClass}
                      </span>
                      <span className="text-[10px] text-[#A1A1B8]/65 font-mono tabular-nums">{msg.timestamp}</span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed inline-block group relative text-left ${
                        msg.isCurrentUser
                          ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white rounded-tr-none shadow-[0_4px_16px_rgba(139,92,246,0.28)]'
                          : 'bg-[#0E0E17] border border-white/10 text-white rounded-tl-none'
                      }`}
                    >
                      <p>{msg.text}</p>
                      {!msg.isCurrentUser && (
                        <button
                          onClick={() => handleReport(msg.id)}
                          className="opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 p-1 bg-[#090910] text-[#A1A1B8] hover:text-[#FB7185] rounded-full border border-white/15 transition-opacity"
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
        <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-[#0E0E17] flex items-center gap-3">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={`Message ${selectedChannel === 'guild' ? 'fellow guildmates' : selectedChannel === 'whisper' ? 'selected friend' : 'the realm'}...`}
            className="flex-1 bg-[#090910] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#A1A1B8]/50 focus:outline-none focus:border-[#8B5CF6]"
          />

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:from-[#7C3AED] hover:to-[#A78BFA] text-white text-xs font-bold font-['Cinzel'] tracking-wider shadow-[0_0_16px_rgba(139,92,246,0.35)] flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
