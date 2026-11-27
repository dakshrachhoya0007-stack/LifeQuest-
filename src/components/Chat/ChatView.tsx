import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getRpgAvatarForClass } from '../../assets/images';
import { PresenceBadge } from '../Brand/PresenceBadge';
import { FeatureBanner, FeatureTabBar } from '../Theme/FeatureThemePrimitives';
import {
  MessageSquare,
  Send,
  Flag,
  Crown,
} from 'lucide-react';
import { LegendTitleBadge } from '../Social/LegendTitleBadge';

const CHAT_CHANNELS: Array<{ id: 'guild' | 'general' | 'whisper'; label: string }> = [
  { id: 'guild', label: 'Guild Chat' },
  { id: 'general', label: 'General Tavern' },
  { id: 'whisper', label: 'Whispers' },
];

export const ChatView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const {
    chatMessages,
    sendChatMessage,
    reportChatMessage,
    guilds,
    friends,
    openPublicProfile,
    setActiveTab,
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
    <div className="space-y-6 pb-12">
      {/* Banner / Channel Toolbar */}
      {embedded ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 lq-surface p-4">
          <div>
            <h2 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7]">
              Realm Chat &amp; Messages
            </h2>
            <p className="text-xs text-[#A69AAF] mt-0.5">
              Coordinate guild raids, celebrate milestones, and whisper companions.
            </p>
          </div>
          <FeatureTabBar
            tabs={CHAT_CHANNELS}
            activeId={selectedChannel}
            onSelect={setSelectedChannel}
            ariaLabel="Chat channels"
            layoutId="chat-channel-tab"
          />
        </div>
      ) : (
        <FeatureBanner>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 text-xs">
                <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#E8C777]">
                  Tavern of Fellowship
                </span>
                <span className="text-[#766D82]" aria-hidden="true">·</span>
                <span className="text-[#A69AAF] font-medium">Real-Time Web &amp; Mobile Channels</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2EDF7] text-balance">
                REALM CHAT &amp; MESSAGES
              </h1>
              <p className="text-xs sm:text-sm text-[#A69AAF] max-w-2xl mt-1">
                Coordinate guild raids, celebrate workout milestones, and share healthy culinary tips across Aetheria.
              </p>
            </div>

            <FeatureTabBar
              tabs={CHAT_CHANNELS}
              activeId={selectedChannel}
              onSelect={setSelectedChannel}
              ariaLabel="Chat channels"
              layoutId="chat-channel-tab"
            />
          </div>
        </FeatureBanner>
      )}

      {notice && (
        <div
          className={`p-3 rounded-xl border text-xs text-center ${
            notice.type === 'error'
              ? 'bg-[#D65C66]/15 border-[#D65C66]/45 text-[#D65C66]'
              : 'bg-[#21152F] border-[#7045A0]/50 text-[#E8C777]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Chat Window */}
      <div className="lq-surface overflow-hidden flex flex-col h-[520px]">
        {/* Chat Header */}
        <div className="px-6 py-3.5 border-b border-[#362B45] bg-[#21152F]/70 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#9A72CC]" />
            <span className="text-xs font-bold font-['Cinzel'] text-[#F2EDF7] uppercase tracking-wider">
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
              className="lq-input py-1 px-2.5 text-[11px] w-auto"
            >
              {acceptedFriends.map(f => (
                <option key={f.champion.id} value={f.champion.id}>
                  Whisper: {f.champion.username}
                </option>
              ))}
            </select>
          )}

          <span className="text-[11px] text-[#A69AAF] font-mono tabular-nums">
            {filteredMessages.length} Messages
          </span>
        </div>

        {legendAnnouncements.length > 0 && (
          <div className="px-6 py-2 bg-[#100D18]/90 border-b border-[#362B45] flex items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center gap-2 min-w-0">
              <Crown className="w-3.5 h-3.5 text-[#D6A84B] shrink-0" />
              <span className="text-[#A69AAF] truncate">
                <span className="font-semibold text-[#E8C777]">Realm Herald:</span>{' '}
                {legendAnnouncements[0].ownerUsername} became the sole worldwide bearer of [{legendAnnouncements[0].titleTag}] ({legendAnnouncements[0].achievementName})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('hall-of-legends')}
              className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-wider text-[#D6A84B] hover:text-[#E8C777] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              Hall of Legends →
            </button>
          </div>
        )}

        {/* Message Log */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#100D18]/75">
          {filteredMessages.length === 0 ? (
            <div className="text-xs text-[#A69AAF] text-center py-12">
              {selectedChannel === 'whisper' && acceptedFriends.length === 0 ? (
                <span>
                  Add a companion in{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('friends')}
                    className="text-[#D6A84B] hover:text-[#E8C777] underline font-semibold transition-colors cursor-pointer"
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
                      className="w-9 h-9 rounded-full object-cover object-top border border-[#7045A0]/60"
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
                        className={`text-xs font-bold text-[#F2EDF7] ${
                          canInspect ? 'hover:text-[#E8C777] transition-colors cursor-pointer' : 'cursor-default'
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
                      <span className="text-[10px] text-[#9A72CC] uppercase font-mono font-medium">
                        {msg.senderClass}
                      </span>
                      <span className="text-[10px] text-[#766D82] font-mono tabular-nums">{msg.timestamp}</span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed inline-block group relative text-left ${
                        msg.isCurrentUser
                          ? 'bg-[#7045A0] border border-[#9A72CC]/50 text-[#F2EDF7] rounded-tr-none shadow-[0_6px_18px_rgba(112,69,160,0.3)]'
                          : 'bg-[#21152F] border border-[#362B45] text-[#F2EDF7] rounded-tl-none'
                      }`}
                    >
                      <p>{msg.text}</p>
                      {!msg.isCurrentUser && (
                        <button
                          type="button"
                          onClick={() => handleReport(msg.id)}
                          className="opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 p-1 bg-[#100D18] text-[#A69AAF] hover:text-[#D65C66] rounded-full border border-[#362B45] transition-opacity cursor-pointer"
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
        <form onSubmit={handleSend} className="p-4 border-t border-[#362B45] bg-[#171220] flex items-center gap-3">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={`Message ${selectedChannel === 'guild' ? 'fellow guildmates' : selectedChannel === 'whisper' ? 'selected friend' : 'the realm'}...`}
            className="lq-input flex-1"
          />

          <button
            type="submit"
            className="lq-btn lq-btn-primary text-xs font-['Cinzel'] tracking-wider flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

