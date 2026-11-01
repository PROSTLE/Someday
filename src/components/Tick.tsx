type Mood = "waving" | "happy" | "watching";

const NAVY = "#1E2A4A";

export function Tick({ mood = "waving", size = 200, className }: { mood?: Mood; size?: number; className?: string }) {
  const ribbon = mood === "happy" ? "#2FA98F" : mood === "watching" ? "#F2C94C" : "#E5575F";
  return (
    <svg
      viewBox="0 0 200 220"
      width={size}
      height={(size * 220) / 200}
      fill="none"
      role="img"
      aria-label="Tick, the Someday mascot"
      className={className}
    >
      <ellipse cx="100" cy="208" rx="70" ry="8" fill="currentColor" opacity="0.1" />
      <g stroke="currentColor" strokeWidth="5" strokeLinecap="round">
        <path d="M78 176 72 200M122 176l6 24M42 110C24 104 18 86 24 70M158 112c14 2 22 10 24 22" />
      </g>
      <ellipse cx="66" cy="202" rx="12" ry="6" fill="currentColor" />
      <ellipse cx="134" cy="202" rx="12" ry="6" fill="currentColor" />
      <circle cx="25" cy="64" r="8" fill="#fff" stroke="currentColor" strokeWidth="4" />
      <circle cx="183" cy="138" r="8" fill="#fff" stroke="currentColor" strokeWidth="4" />
      <rect x="40" y="36" width="120" height="142" rx="14" fill="#FFFDF6" stroke="currentColor" strokeWidth="5" />
      <path d="M42.5 62V50A11.5 11.5 0 0 1 54 38.5h92A11.5 11.5 0 0 1 157.5 50v12z" fill="#8FDFC3" />
      <path d="M42 62h116" stroke={NAVY} strokeWidth="4" />
      <circle cx="58" cy="50" r="4" fill={NAVY} />
      <circle cx="72" cy="50" r="4" fill="#2FA98F" />
      <path d="M56 142h88M56 158h88" stroke="#D5E6DF" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="66" cy="114" rx="9" ry="6" fill="#F7B8BE" />
      <ellipse cx="134" cy="114" rx="9" ry="6" fill="#F7B8BE" />
      {mood === "happy" ? (
        <>
          <path d="M72 100c3-7 13-7 16 0M112 100c3-7 13-7 16 0" stroke={NAVY} strokeWidth="5" strokeLinecap="round" />
          <path d="M84 112h32q0 16-16 16t-16-16z" fill={NAVY} />
        </>
      ) : (
        <>
          <circle cx="80" cy="98" r="7" fill={NAVY} />
          <circle cx="120" cy="98" r="7" fill={NAVY} />
          <circle cx={mood === "watching" ? 82 : 83} cy={mood === "watching" ? 93 : 95} r="2.2" fill="#fff" />
          <circle cx={mood === "watching" ? 122 : 123} cy={mood === "watching" ? 93 : 95} r="2.2" fill="#fff" />
          {mood === "watching" ? (
            <ellipse cx="100" cy="119" rx="6" ry="7" fill={NAVY} />
          ) : (
            <path d="M86 114q14 14 28 0" stroke={NAVY} strokeWidth="5" strokeLinecap="round" />
          )}
        </>
      )}
      <path d="M124 24h24v50l-12-10-12 10z" fill={ribbon} stroke={NAVY} strokeWidth="4" strokeLinejoin="round" />
      {mood === "happy" && (
        <path d="m129 42 5 5 9-10" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
