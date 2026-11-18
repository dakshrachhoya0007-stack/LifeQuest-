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
        className="pointer-events-auto relative w-28 h-28 rounded-full bg-[#0e0b1a]/80 border-2 border-[#C5A15A]/45 shadow-xl touch-none flex items-center justify-center"
        aria-label="Movement Joystick"
      >
        <div className="w-10 h-10 rounded-full border border-[#C5A15A]/25" />
        <div
          className="absolute w-11 h-11 rounded-full bg-gradient-to-br from-[#C5A15A] to-[#8a6a2a] border border-[#fff2cf]/60 shadow-lg transition-transform duration-75"
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
          className="w-28 h-12 rounded-xl bg-[#0e0b1a]/75 border border-[#C5A15A]/35 flex items-center justify-center text-[10px] font-['Cinzel'] font-bold text-[#C5A15A]/80 touch-none"
        >
          DRAG LOOK
        </div>

        <div className="flex items-center gap-2">
          {canInteract && (
            <button
              type="button"
              onClick={onInteract}
              title={interactLabel || 'Interact'}
              className="px-3.5 py-2.5 rounded-xl bg-[#C5A15A] text-[#0e0b1a] font-['Cinzel'] font-black text-xs shadow-lg flex items-center gap-1.5 active:scale-95"
            >
              <Hand className="w-4 h-4" />
              Interact
            </button>
          )}

          <button
            type="button"
            onClick={toggleSprint}
            className={`w-12 h-12 rounded-full border flex flex-col items-center justify-center text-[9px] font-bold transition-colors ${
              sprintLocked
                ? 'bg-[#C5A15A] text-[#0e0b1a] border-[#fff0c2]'
                : 'bg-[#0e0b1a]/85 text-[#D9D2C5] border-[#C5A15A]/45'
            }`}
            aria-label="Toggle Sprint"
          >
            <Zap className="w-4 h-4" />
            <span>RUN</span>
          </button>

          <button
            type="button"
            onClick={onJump}
            className="w-14 h-14 rounded-full bg-[#251638]/90 hover:bg-[#3a2257] border-2 border-[#C5A15A]/65 text-[#F5EFE6] flex flex-col items-center justify-center text-[10px] font-bold shadow-xl active:scale-95"
            aria-label="Jump"
          >
            <ArrowUp className="w-5 h-5 text-[#C5A15A]" />
            <span>JUMP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
