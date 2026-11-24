import React, { useRef, useState } from 'react';
import { ArrowUp, Hand, Zap } from 'lucide-react';
import { VirtualMoveInput } from './ThirdPersonController';

interface MobileTouchControlsProps {
  onMoveChange: (input: VirtualMoveInput) => void;
  onCameraRotate: (dYaw: number, dPitch: number) => void;
  onJump: () => void;
  onInteract: () => void;
  canInteract: boolean;
  interactLabel?: string;
}

export const MobileTouchControls: React.FC<MobileTouchControlsProps> = ({
  onMoveChange,
  onCameraRotate,
  onJump,
  onInteract,
  canInteract,
  interactLabel,
}) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [sprintLocked, setSprintLocked] = useState(false);
  const activeTouchIdRef = useRef<number | null>(null);
  const camDragRef = useRef<{ x: number; y: number } | null>(null);
  const currentMoveRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const MAX_RADIUS = 38;

  const updateStick = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_RADIUS) {
      dx = (dx / dist) * MAX_RADIUS;
      dy = (dy / dist) * MAX_RADIUS;
    }
    setKnobOffset({ x: dx, y: dy });
    const nx = dx / MAX_RADIUS;
    const ny = -dy / MAX_RADIUS;
    currentMoveRef.current = { x: nx, y: ny };
    onMoveChange({ x: nx, y: ny, sprint: sprintLocked });
  };

  const resetStick = () => {
    activeTouchIdRef.current = null;
    setKnobOffset({ x: 0, y: 0 });
    currentMoveRef.current = { x: 0, y: 0 };
    onMoveChange({ x: 0, y: 0, sprint: sprintLocked });
  };

  const toggleSprint = () => {
    const next = !sprintLocked;
    setSprintLocked(next);
    onMoveChange({
      x: currentMoveRef.current.x,
      y: currentMoveRef.current.y,
      sprint: next,
    });
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 px-4 flex items-end justify-between z-30">
      {/* Left: Virtual Analog Movement Joystick */}
      <div
        ref={padRef}
        onPointerDown={e => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          activeTouchIdRef.current = e.pointerId;
          updateStick(e.clientX, e.clientY);
        }}
        onPointerMove={e => {
          if (activeTouchIdRef.current !== e.pointerId) return;
          updateStick(e.clientX, e.clientY);
        }}
        onPointerUp={e => {
          if (activeTouchIdRef.current === e.pointerId) resetStick();
        }}
        onPointerCancel={resetStick}
        className="pointer-events-auto relative w-28 h-28 rounded-full bg-[#0A1930]/85 border-2 border-[#1677FF]/45 shadow-[0_8px_24px_rgba(2,8,20,0.6)] touch-none flex items-center justify-center backdrop-blur-md"
        aria-label="Movement Joystick"
      >
        <div className="w-10 h-10 rounded-full border border-[#00D9FF]/30" />
        <div
          className="absolute w-11 h-11 rounded-full bg-gradient-to-br from-[#1677FF] to-[#00D9FF] border border-white/60 shadow-[0_0_16px_rgba(0,217,255,0.45)] transition-transform duration-75"
          style={{
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          }}
        />
      </div>

      {/* Right: Camera Look Pad + Sprint / Jump / Interact Buttons */}
      <div className="pointer-events-auto flex flex-col items-end gap-2.5">
        <div
          onPointerDown={e => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            camDragRef.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerMove={e => {
            if (!camDragRef.current) return;
            const dx = e.clientX - camDragRef.current.x;
            const dy = e.clientY - camDragRef.current.y;
            camDragRef.current = { x: e.clientX, y: e.clientY };
            onCameraRotate(dx * 0.008, dy * 0.006);
          }}
          onPointerUp={() => {
            camDragRef.current = null;
          }}
          onPointerCancel={() => {
            camDragRef.current = null;
          }}
          className="w-28 h-12 rounded-xl bg-[#0A1930]/85 border border-[#1677FF]/40 flex items-center justify-center text-[10px] font-['Cinzel'] font-bold text-[#00D9FF] touch-none backdrop-blur-md"
        >
          DRAG LOOK
        </div>

        <div className="flex items-center gap-2">
          {canInteract && (
            <button
              type="button"
              onClick={onInteract}
              title={interactLabel || 'Interact'}
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white font-['Cinzel'] font-black text-xs shadow-[0_0_16px_rgba(22,119,255,0.45)] flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Hand className="w-4 h-4" />
              Interact
            </button>
          )}

          <button
            type="button"
            onClick={toggleSprint}
            className={`w-12 h-12 rounded-full border flex flex-col items-center justify-center text-[9px] font-bold transition-all ${
              sprintLocked
                ? 'bg-gradient-to-br from-[#1677FF] to-[#0099FF] text-white border-[#00D9FF] shadow-[0_0_14px_rgba(0,217,255,0.45)]'
                : 'bg-[#0A1930]/90 text-[#A9B8CC] border-[#1677FF]/45 hover:border-[#00D9FF]/50'
            }`}
            aria-label="Toggle Sprint"
          >
            <Zap className="w-4 h-4" />
            <span>RUN</span>
          </button>

          <button
            type="button"
            onClick={onJump}
            className="w-14 h-14 rounded-full bg-[#102440]/90 hover:bg-[#16325C] border-2 border-[#00D9FF]/60 text-white flex flex-col items-center justify-center text-[10px] font-bold shadow-[0_8px_24px_rgba(2,8,20,0.6)] active:scale-95 transition-all"
            aria-label="Jump"
          >
            <ArrowUp className="w-5 h-5 text-[#00D9FF]" />
            <span>JUMP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
