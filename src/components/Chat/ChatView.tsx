import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getRpgAvatarForClass } from '../../assets/images';
import {
  MessageSquare,
  Send,
  Flag,
} from 'lucide-react';

export const ChatView: React.FC = () => {
  const {
    chatMessages,
    sendChatMessage,
    reportChatMessage,
    guilds,
    friends,
    openPublicProfile,
    setActiveTab,
  } = useGame();
  const [selectedChannel, setSelectedChannel] = useState<'guild' | 'general' | 'whisper'>('general');
  const [inputText, setInputText] = useState('');
  const [whisperRecipientId, setWhisperRecipientId] = useState<string>('');
  const [notice, setNotice] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  const myGuild = guilds.find(g => g.isMember);
  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const filteredMessages = chatMessages.filter(m => m.channel === selectedChannel);

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
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#170e2f] via-[#100a20] to-[#1a1236] border border-purple-900/60 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-purple-400">
                Tavern of Fellowship
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-purple-300 font-semibold">Real-Time Web & Mobile Channels</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
              REALM CHAT & MESSAGES
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              Coordinate guild raids, celebrate workout milestones, and share healthy culinary tips across Aetheria.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-[#090714] rounded-xl border border-purple-950">
            <button
              onClick={() => setSelectedChannel('guild')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedChannel === 'guild' ? 'bg-purple-800 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Guild Chat
            </button>
            <button
              onClick={() => setSelectedChannel('general')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedChannel === 'general' ? 'bg-purple-800 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              General Tavern
            </button>
            <button
              onClick={() => setSelectedChannel('whisper')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedChannel === 'whisper' ? 'bg-purple-800 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Whispers
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div
          className={`p-3 rounded-xl border text-xs text-center animate-in fade-in ${
            notice.type === 'error'
              ? 'bg-rose-950/80 border-rose-700 text-rose-200'
              : 'bg-purple-950/80 border-purple-600 text-purple-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Chat Window */}
      <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[520px]">
        {/* Chat Header */}
        <div className="px-6 py-3.5 border-b border-purple-950/80 bg-[#130f24] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
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
              className="bg-[#090714] border border-purple-800 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none"
            >
              {acceptedFriends.map(f => (
                <option key={f.champion.id} value={f.champion.id}>
                  Whisper: {f.champion.username}
                </option>
              ))}
            </select>
          )}

          <span className="text-[11px] text-slate-400 font-mono tabular-nums">
            {filteredMessages.length} Messages
          </span>
        </div>

        {/* Message Log */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-12">
              {selectedChannel === 'whisper' && acceptedFriends.length === 0 ? (
                <span>
                  Add a companion in{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('friends')}
                    className="text-purple-300 hover:text-amber-300 underline font-semibold"
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
                      className="w-9 h-9 rounded-full object-cover object-top border border-purple-700/60"
                    />
                  </button>

                  <div className={`max-w-md ${msg.isCurrentUser ? 'text-right' : 'text-left'}`}>
                    <div
                      className={`flex items-center gap-2 mb-1 ${
                        msg.isCurrentUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <button
                        type="button"
                        disabled={!canInspect}
                        onClick={() => msg.senderId && openPublicProfile(msg.senderId)}
                        className={`text-xs font-bold text-slate-200 ${
                          canInspect ? 'hover:text-amber-300 transition-colors cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        {msg.senderName}
                      </button>
                      <span className="text-[10px] text-purple-400 uppercase font-mono font-medium">
                        {msg.senderClass}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono tabular-nums">{msg.timestamp}</span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed inline-block group relative text-left ${
                        msg.isCurrentUser
                          ? 'bg-purple-800 text-white rounded-tr-none'
                          : 'bg-[#140f26] border border-purple-900/60 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      <p>{msg.text}</p>
                      {!msg.isCurrentUser && (
                        <button
                          onClick={() => handleReport(msg.id)}
                          className="opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 p-1 bg-[#090714] text-slate-500 hover:text-rose-400 rounded-full border border-purple-900 transition-opacity"
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
        <form onSubmit={handleSend} className="p-4 border-t border-purple-950/80 bg-[#130f24] flex items-center gap-3">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={`Message ${selectedChannel === 'guild' ? 'fellow guildmates' : selectedChannel === 'whisper' ? 'selected friend' : 'the realm'}...`}
            className="flex-1 bg-[#090714] border border-purple-900/70 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold font-['Cinzel'] tracking-wider shadow flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
