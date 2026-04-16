export default function CoatOfArms({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <path d="M10 6 H70 V48 Q40 66 40 66 Q40 66 10 48 Z" fill="#1a3a7a" stroke="#FFD700" strokeWidth="1"/>
      <path d="M40 6 V66" stroke="#FFD700" strokeWidth="4"/>
      <path d="M10 34 H70" stroke="#FFD700" strokeWidth="4"/>
      <clipPath id="coa-shield"><path d="M10 6 H70 V48 Q40 66 40 66 Q40 66 10 48 Z"/></clipPath>
      <g clipPath="url(#coa-shield)">
        <rect x="10" y="6" width="28" height="26" fill="#006B3F"/>
        <rect x="42" y="6" width="28" height="26" fill="#006B3F"/>
        <path d="M10 38 H38 V66 Q40 66 40 66 Q40 66 10 48 Z" fill="#006B3F"/>
        <path d="M42 38 H70 V48 Q40 66 40 66 Z" fill="#006B3F"/>
        <ellipse cx="40" cy="18" rx="6" ry="8" fill="#FFD700"/>
        <path d="M36 10 L40 14 L44 10" stroke="#2d7a2d" strokeWidth="1.5" fill="none"/>
        <path d="M12 36 Q20 31 28 36 Q20 41 12 36Z" fill="#FFD700"/>
        <path d="M52 36 Q60 31 68 36 Q60 41 52 36Z" fill="#FFD700"/>
      </g>
      <path d="M10 6 H70 V48 Q40 66 40 66 Q40 66 10 48 Z" fill="none" stroke="#FFD700" strokeWidth="1.5"/>
      <rect x="8" y="66" width="64" height="12" rx="2" fill="#1a3a7a"/>
      <text x="40" y="74" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#FFD700" fontFamily="serif">OUT OF MANY ONE PEOPLE</text>
    </svg>
  )
}