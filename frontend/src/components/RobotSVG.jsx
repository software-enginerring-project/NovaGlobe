import React from 'react';
import { motion } from 'framer-motion';

/**
 * NovaGlobe Robot Mascot — a glowing cyan SVG robot inspired by the reference design.
 * Props:
 *   size      — pixel height (default 120)
 *   speaking  — if true, the mouth animates
 *   blinking  — if true, eyes periodically blink (default true)
 */
const RobotSVG = ({ size = 120, speaking = false, blinking = true }) => {
  const scale = size / 120;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 0 18px rgba(8, 201, 192, 0.5))' }}
    >
      <defs>
        {/* Body gradient */}
        <radialGradient id="robotBodyGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#5FFFFF" />
          <stop offset="50%" stopColor="#08C9C0" />
          <stop offset="100%" stopColor="#047A75" />
        </radialGradient>

        {/* Head gradient */}
        <radialGradient id="robotHeadGrad" cx="50%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#7FFFFF" />
          <stop offset="45%" stopColor="#14DDD4" />
          <stop offset="100%" stopColor="#058F88" />
        </radialGradient>

        {/* Outer glow */}
        <radialGradient id="outerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="rgba(8,201,192,0)" />
          <stop offset="100%" stopColor="rgba(8,201,192,0.15)" />
        </radialGradient>

        {/* Screen gradient */}
        <linearGradient id="screenGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a2233" />
          <stop offset="100%" stopColor="#071824" />
        </linearGradient>

        {/* Eye glow filter */}
        <filter id="eyeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Ambient glow */}
      <circle cx="60" cy="60" r="58" fill="url(#outerGlow)" />

      {/* ── Antenna ── */}
      <motion.line
        x1="60" y1="18" x2="60" y2="8"
        stroke="#14DDD4"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <motion.circle
        cx="60" cy="6" r="3"
        fill="#5FFFFF"
        animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Head ── */}
      <rect x="35" y="18" width="50" height="36" rx="14" fill="url(#robotHeadGrad)" />
      {/* Head highlight */}
      <ellipse cx="52" cy="25" rx="14" ry="6" fill="rgba(255,255,255,0.18)" />

      {/* ── Eyes ── */}
      <g filter="url(#eyeGlow)">
        {/* Left eye */}
        <motion.ellipse
          cx="48" cy="34"
          rx="6" ry={blinking ? undefined : 6}
          fill="#FFFFFF"
          animate={blinking ? { ry: [6, 6, 1, 6, 6] } : {}}
          transition={blinking ? { duration: 4, repeat: Infinity, times: [0, 0.42, 0.45, 0.48, 1] } : {}}
        />
        <circle cx="48" cy="34" r="3" fill="#0a2233" />
        <circle cx="49.5" cy="32.5" r="1.2" fill="#fff" opacity="0.9" />

        {/* Right eye */}
        <motion.ellipse
          cx="72" cy="34"
          rx="6" ry={blinking ? undefined : 6}
          fill="#FFFFFF"
          animate={blinking ? { ry: [6, 6, 1, 6, 6] } : {}}
          transition={blinking ? { duration: 4, repeat: Infinity, times: [0, 0.42, 0.45, 0.48, 1], delay: 0.1 } : {}}
        />
        <circle cx="72" cy="34" r="3" fill="#0a2233" />
        <circle cx="73.5" cy="32.5" r="1.2" fill="#fff" opacity="0.9" />
      </g>

      {/* ── Mouth ── */}
      {speaking ? (
        <motion.ellipse
          cx="60" cy="44"
          rx="5"
          fill="#0a2233"
          animate={{ ry: [2, 4, 1.5, 3.5, 2] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
      ) : (
        <path
          d="M53 43 Q60 48 67 43"
          stroke="#0a2233"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* ── Ears ── */}
      <rect x="30" y="30" width="6" height="10" rx="3" fill="#08C9C0" />
      <rect x="84" y="30" width="6" height="10" rx="3" fill="#08C9C0" />

      {/* ── Body ── */}
      <rect x="32" y="56" width="56" height="34" rx="10" fill="url(#robotBodyGrad)" />
      {/* Body highlight */}
      <ellipse cx="50" cy="62" rx="16" ry="5" fill="rgba(255,255,255,0.12)" />

      {/* ── Screen on body ── */}
      <rect x="40" y="62" width="40" height="18" rx="4" fill="url(#screenGrad)" />
      <rect x="40" y="62" width="40" height="18" rx="4" fill="none" stroke="rgba(8,201,192,0.35)" strokeWidth="0.8" />
      {/* Screen text */}
      <text x="60" y="72" textAnchor="middle" fill="#08C9C0" fontSize="6" fontFamily="monospace" fontWeight="bold" letterSpacing="0.5">
        NovaGlobe
      </text>
      <text x="60" y="78" textAnchor="middle" fill="rgba(8,201,192,0.5)" fontSize="3.5" fontFamily="monospace" letterSpacing="0.8">
        AI GUIDE
      </text>

      {/* ── Arms ── */}
      {/* Left arm */}
      <motion.g
        animate={{ rotate: [0, -5, 0, 5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '32px 62px' }}
      >
        <rect x="22" y="60" width="10" height="22" rx="5" fill="#08C9C0" />
        {/* Left hand */}
        <circle cx="27" cy="84" r="5" fill="#14DDD4" />
      </motion.g>

      {/* Right arm */}
      <motion.g
        animate={{ rotate: [0, 5, 0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        style={{ transformOrigin: '88px 62px' }}
      >
        <rect x="88" y="60" width="10" height="22" rx="5" fill="#08C9C0" />
        {/* Right hand */}
        <circle cx="93" cy="84" r="5" fill="#14DDD4" />
      </motion.g>

      {/* ── Legs ── */}
      {/* Left leg */}
      <rect x="42" y="90" width="10" height="16" rx="5" fill="#058F88" />
      <rect x="39" y="104" width="14" height="6" rx="3" fill="#047A75" />

      {/* Right leg */}
      <rect x="68" y="90" width="10" height="16" rx="5" fill="#058F88" />
      <rect x="65" y="104" width="14" height="6" rx="3" fill="#047A75" />
    </motion.svg>
  );
};

export default RobotSVG;
