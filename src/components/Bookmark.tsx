export function Bookmark({ done, label, onToggle }: { done: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={`Mark ${label} as done`}
      onClick={onToggle}
      className="group inline-flex size-11 shrink-0 items-center justify-center"
    >
      <svg viewBox="0 0 22 30" width="22" height="30" fill="none" aria-hidden className={done ? "ticked" : ""}>
        <path
          d="M2 2h18v26l-9-7-9 7z"
          strokeWidth="2.5"
          strokeLinejoin="round"
          className={done ? "fill-teal stroke-teal" : "fill-transparent stroke-ink group-hover:fill-t-yellow"}
        />
        {done && (
          <path d="m6.5 11 3.2 3.2 6-6.4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}
