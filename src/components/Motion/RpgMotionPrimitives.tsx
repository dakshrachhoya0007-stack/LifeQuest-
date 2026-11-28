import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AtmosphereParticlesCanvas } from '../Dashboard/AtmosphereParticlesCanvas';

export const LQ_EASE = [0.16, 1, 0.3, 1] as const;

interface AetheriaAtmosphericBackdropProps {
  primaryRgb?: string;
  secondaryRgb?: string;
}

/**
 * Restrained dark-fantasy atmospheric lighting layer:
 * Slow-moving ambient radial light clouds + subtle drifting dust motes.
 * Automatically degrades cleanly when prefers-reduced-motion is enabled.
 */
export const AetheriaAtmosphericBackdrop: React.FC<AetheriaAtmosphericBackdropProps> = ({
  primaryRgb = '22, 119, 255',
  secondaryRgb = '0, 217, 255',
}) => {
  const prefersReduced = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
    >
      {/* Primary Electric Blue Nebula Cloud */}
      <div
        className={`absolute -top-36 left-1/4 w-[62vw] max-w-[840px] h-[50vh] rounded-full blur-[110px] transition-colors duration-700 ${
          prefersReduced ? '' : 'lq-aurora-drift'
        }`}
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(${primaryRgb}, 0.14) 0%, rgba(16, 36, 64, 0.08) 48%, transparent 76%)`,
        }}
      />

      {/* Secondary Cyan Ambient Glow */}
      <div
        className={`absolute top-1/3 -right-24 w-[46vw] max-w-[640px] h-[44vh] rounded-full blur-[115px] transition-colors duration-700 ${
          prefersReduced ? '' : 'lq-aurora-drift-slow'
        }`}
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(${secondaryRgb}, 0.09) 0%, rgba(22, 119, 255, 0.05) 50%, transparent 76%)`,
        }}
      />

      {/* Subtle Ambient Dust Motes */}
      {!prefersReduced && (
        <div className="absolute inset-0 opacity-40">
          <AtmosphereParticlesCanvas qualityMode="eco" reducedMotion={false} />
        </div>
      )}
    </div>
  );
};

interface RpgPageTransitionProps {
  routeKey: string;
  children: React.ReactNode;
}

export const RpgPageTransition: React.FC<RpgPageTransitionProps> = ({
  routeKey,
  children,
}) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div key={routeKey}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={routeKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.2, ease: LQ_EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

interface RpgSubTabTransitionProps {
  tabKey: string;
  children: React.ReactNode;
  className?: string;
}

export const RpgSubTabTransition: React.FC<RpgSubTabTransitionProps> = ({
  tabKey,
  children,
  className = '',
}) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.16, ease: LQ_EASE }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

interface RpgScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  yOffset?: number;
}

export const RpgScrollReveal: React.FC<RpgScrollRevealProps> = ({
  children,
  className = '',
  delay = 0,
  yOffset = 16,
}) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.38, delay, ease: LQ_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface RpgStaggerGridProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}

export const RpgStaggerGrid: React.FC<RpgStaggerGridProps> = ({
  children,
  className = '',
  stagger = 0.04,
}) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface RpgStaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export const RpgStaggerItem: React.FC<RpgStaggerItemProps> = ({
  children,
  className = '',
}) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.3, ease: LQ_EASE },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface AnimatedProgressBarProps {
  percentage: number;
  className?: string;
  barClassName?: string;
  barStyle?: React.CSSProperties;
  shimmer?: boolean;
  delay?: number;
}

/**
 * GPU-composited progress bar using scaleX from origin-left.
 */
export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  percentage,
  className = 'w-full h-2.5 rounded-full bg-[#061225] border border-[#1E3A63] overflow-hidden',
  barClassName = 'bg-gradient-to-r from-[#1677FF] via-[#0099FF] to-[#00D9FF]',
  barStyle,
  shimmer = true,
  delay = 0.06,
}) => {
  const prefersReduced = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percentage) ? percentage : 0));
  const targetScale = clamped / 100;

  if (prefersReduced) {
    return (
      <div className={className}>
        <div
          className={`h-full w-full origin-left rounded-full ${barClassName}`}
          style={{ ...barStyle, transform: `scaleX(${targetScale})` }}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: targetScale }}
        transition={{ duration: 0.6, delay, ease: LQ_EASE }}
        className={`h-full w-full origin-left rounded-full ${shimmer ? 'lq-shimmer-bar' : ''} ${barClassName}`}
        style={barStyle}
      />
    </div>
  );
};

interface AnimatedCounterProps {
  value: number;
  durationMs?: number;
  className?: string;
  format?: (n: number) => string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  durationMs = 650,
  className = '',
  format = n => Math.round(n).toLocaleString(),
}) => {
  const prefersReduced = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(0);

  useEffect(() => {
    if (prefersReduced) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const startValue = prevValueRef.current;
    const diff = value - startValue;
    if (diff === 0) {
      setDisplayValue(value);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const current = startValue + diff * eased;
      setDisplayValue(current);

      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        prevValueRef.current = value;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, durationMs, prefersReduced]);

  return <span className={`tabular-nums ${className}`}>{format(displayValue)}</span>;
};

interface RpgModalWrapperProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  zIndexClass?: string;
  backdropClassName?: string;
  panelClassName?: string;
}

export const RpgModalWrapper: React.FC<RpgModalWrapperProps> = ({
  isOpen,
  onClose,
  children,
  zIndexClass = 'z-50',
  backdropClassName = 'bg-[#061225]/85 backdrop-blur-md',
  panelClassName = 'w-full max-w-lg',
}) => {
  const prefersReduced = useReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReduced ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18, ease: LQ_EASE }}
          onClick={e => {
            if (onClose && e.target === e.currentTarget) {
              onClose();
            }
          }}
          className={`fixed inset-0 ${zIndexClass} ${backdropClassName} flex items-center justify-center p-4 overflow-y-auto`}
        >
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReduced ? undefined : { opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.22, ease: LQ_EASE }}
            className={panelClassName}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface RpgDropdownProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}

export const RpgDropdown: React.FC<RpgDropdownProps> = ({
  isOpen,
  children,
  className = '',
}) => {
  const prefersReduced = useReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={prefersReduced ? undefined : { opacity: 0, y: -4, scale: 0.97 }}
          transition={{ duration: 0.16, ease: LQ_EASE }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
