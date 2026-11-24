import React from 'react';
import { HEARTLANDS_LANDMARKS } from '../../../data/heartlandsWorldData';

interface WorldMinimapProps {
  playerX: number;
  playerZ: number;
  cameraYaw: number;
  zoneName: string;
}

const WORLD_SPAN = 96; // maps [-96..+96] onto minimap radius

export const WorldMinimap: React.FC<WorldMinimapProps> = ({
  playerX,
  playerZ,
  cameraYaw,
  zoneName,
}) => {
  const toSvgCoord = (wx: number, wz: number) => ({
    sx: 60 + (wx / WORLD_SPAN) * 48,
    sy: 60 + (wz / WORLD_SPAN) * 48,
  });

  const playerPt = toSvgCoord(playerX, playerZ);
  // Camera yaw 0 looks along -Z (upward on map), so heading rotation in deg:
  const headingDeg = (-cameraYaw * 180) / Math.PI;

  return (
    <div className="flex flex-col items-end gap-1.5 select-none">
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#061225]/90 border-2 border-[#1677FF]/60 shadow-[0_12px_32px_rgba(2,8,20,0.7)] overflow-hidden backdrop-blur-md">
        <svg viewBox="0 0 120 120" className="w-full h-full">
          {/* Deep valley radar disc */}
          <circle cx="60" cy="60" r="56" fill="#0A1930" stroke="#00D9FF" strokeOpacity="0.25" strokeWidth="1" />

          {/* Whispering River ribbon */}
          <path
            d="M 6,41 Q 35,45 60,42 T 114,40"
            fill="none"
            stroke="#1677FF"
            strokeWidth="4.5"
            strokeOpacity="0.7"
          />

          {/* Ancient Cobble Roads */}
          <line x1="60" y1="70" x2="60" y2="24" stroke="#64748B" strokeWidth="2" strokeOpacity="0.75" />
          <line x1="60" y1="60" x2="35" y2="54" stroke="#64748B" strokeWidth="1.8" strokeOpacity="0.7" />
          <line x1="60" y1="60" x2="86" y2="53" stroke="#64748B" strokeWidth="1.8" strokeOpacity="0.7" />

          {/* Sanctuary Center Marker */}
          <circle cx="60" cy="60" r="4.2" fill="#00D9FF" stroke="#FFFFFF" strokeWidth="1" />

          {/* Four Heartlands Landmarks */}
          {HEARTLANDS_LANDMARKS.map(lm => {
            const pt = toSvgCoord(lm.coordinates.x, lm.coordinates.z);
            return (
              <g key={lm.id}>
                <circle
                  cx={pt.sx}
                  cy={pt.sy}
                  r="3.2"
                  fill={lm.id === 'ancient_castle' ? '#1677FF' : lm.id === 'sacred_shrine' ? '#00D9FF' : '#93C5FD'}
                  stroke="#061225"
                  strokeWidth="1"
                />
              </g>
            );
          })}

          {/* Player Arrow Marker */}
          <g transform={`translate(${playerPt.sx}, ${playerPt.sy}) rotate(${headingDeg})`}>
            <polygon points="0,-6 4.2,4.5 0,2 -4.2,4.5" fill="#ffffff" stroke="#00D9FF" strokeWidth="1" />
          </g>
        </svg>

        {/* Compass N label */}
        <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-['Cinzel'] font-black text-[#00D9FF]">
          N
        </span>
      </div>

      <span className="px-2.5 py-0.5 rounded bg-[#0A1930]/90 border border-[#1677FF]/40 text-[10px] font-['Cinzel'] font-bold text-[#FFFFFF] tracking-wide max-w-[165px] truncate backdrop-blur-md">
        {zoneName}
      </span>
    </div>
  );
};
