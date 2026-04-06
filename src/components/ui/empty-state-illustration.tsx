'use client';

export function EmptyStateIllustration({ className }: { className?: string }) {
  return (
    <svg
      width="200"
      height="180"
      viewBox="0 0 200 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="empGlow" cx="50%" cy="100%" r="50%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="empCard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4c1d95" />
          <stop offset="100%" stopColor="#1e0f3a" />
        </linearGradient>
      </defs>

      {/* Bottom glow */}
      <ellipse cx="100" cy="155" rx="70" ry="18" fill="url(#empGlow)" />

      {/* Left film strip */}
      <rect
        x="10"
        y="60"
        width="26"
        height="74"
        rx="4"
        fill="#3b0764"
        stroke="#7c3aed"
        strokeWidth="1.5"
      />
      <rect x="10" y="60" width="26" height="10" rx="4" fill="#5b21b6" />
      <rect x="10" y="124" width="26" height="10" rx="4" fill="#5b21b6" />
      <rect
        x="16"
        y="74"
        width="14"
        height="9"
        rx="2"
        fill="#1e0f3a"
        stroke="#6d28d9"
        strokeWidth="0.8"
      />
      <rect
        x="16"
        y="86"
        width="14"
        height="9"
        rx="2"
        fill="#1e0f3a"
        stroke="#6d28d9"
        strokeWidth="0.8"
      />
      <rect
        x="16"
        y="98"
        width="14"
        height="9"
        rx="2"
        fill="#1e0f3a"
        stroke="#6d28d9"
        strokeWidth="0.8"
      />
      <rect
        x="16"
        y="110"
        width="14"
        height="9"
        rx="2"
        fill="#1e0f3a"
        stroke="#6d28d9"
        strokeWidth="0.8"
      />

      {/* Right film strip */}
      <rect
        x="164"
        y="60"
        width="26"
        height="74"
        rx="4"
        fill="#3b0764"
        stroke="#7c3aed"
        strokeWidth="1.5"
      />
      <rect x="164" y="60" width="26" height="10" rx="4" fill="#5b21b6" />
      <rect x="164" y="124" width="26" height="10" rx="4" fill="#5b21b6" />
      <rect
        x="170"
        y="74"
        width="14"
        height="9"
        rx="2"
        fill="#1e0f3a"
        stroke="#6d28d9"
        strokeWidth="0.8"
      />
      <rect
        x="170"
        y="86"
        width="14"
        height="9"
        rx="2"
        fill="#1e0f3a"
        stroke="#6d28d9"
        strokeWidth="0.8"
      />
      <rect
        x="170"
        y="98"
        width="14"
        height="9"
        rx="2"
        fill="#1e0f3a"
        stroke="#6d28d9"
        strokeWidth="0.8"
      />
      <rect
        x="170"
        y="110"
        width="14"
        height="9"
        rx="2"
        fill="#1e0f3a"
        stroke="#6d28d9"
        strokeWidth="0.8"
      />

      {/* Center card */}
      <rect
        x="46"
        y="44"
        width="108"
        height="88"
        rx="12"
        fill="url(#empCard)"
        stroke="#7c3aed"
        strokeWidth="1.5"
      />

      {/* Clapperboard top bar */}
      <rect x="46" y="44" width="108" height="26" rx="12" fill="#5b21b6" />
      <rect x="46" y="58" width="108" height="12" fill="#5b21b6" />
      {/* Clapper stripes */}
      <polygon points="52,44 66,44 58,70 44,70" fill="#ffffff" opacity="0.12" />
      <polygon points="70,44 84,44 76,70 62,70" fill="#ffffff" opacity="0" />
      <polygon points="88,44 102,44 94,70 80,70" fill="#ffffff" opacity="0.12" />
      <polygon points="106,44 120,44 112,70 98,70" fill="#ffffff" opacity="0" />
      <polygon points="124,44 138,44 130,70 116,70" fill="#ffffff" opacity="0.12" />
      <polygon points="142,44 154,44 146,70 132,70" fill="#ffffff" opacity="0" />
      <rect
        x="46"
        y="44"
        width="108"
        height="26"
        rx="12"
        fill="none"
        stroke="#7c3aed"
        strokeWidth="1.5"
      />

      {/* Hinge pins */}
      <rect x="60" y="40" width="4" height="10" rx="2" fill="#a78bfa" />
      <rect x="136" y="40" width="4" height="10" rx="2" fill="#a78bfa" />

      {/* Play button */}
      <circle cx="100" cy="105" r="22" fill="#4c1d95" stroke="#a78bfa" strokeWidth="1.5" />
      <circle cx="100" cy="105" r="18" fill="#5b21b6" opacity="0.4" />
      <polygon points="96,97 96,113 114,105" fill="#c4b5fd" />

      {/* Stars */}
      <path
        d="M38 42 L40 36 L42 42 L48 42 L43 46 L45 52 L40 48 L35 52 L37 46 L32 42 Z"
        fill="#a78bfa"
        opacity="0.9"
      />
      <path
        d="M160 32 L161.5 27 L163 32 L168 32 L164 35 L165.5 40 L161.5 37 L157.5 40 L159 35 L155 32 Z"
        fill="#8b5cf6"
        opacity="0.7"
      />

      {/* Sparkles */}
      <line
        x1="175"
        y1="52"
        x2="175"
        y2="60"
        stroke="#c4b5fd"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.8"
      />
      <line
        x1="171"
        y1="56"
        x2="179"
        y2="56"
        stroke="#c4b5fd"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.8"
      />
      <circle cx="50" cy="148" r="3" fill="#7c3aed" opacity="0.7" />
      <circle cx="150" cy="145" r="2" fill="#8b5cf6" opacity="0.6" />
    </svg>
  );
}
