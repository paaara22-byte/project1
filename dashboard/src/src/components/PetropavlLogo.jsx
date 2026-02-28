export function PetropavlLogo({ className = "" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-ops-blue to-ops-teal shadow-glow border border-cyan-400/30">
        <svg
          viewBox="0 0 24 24"
          className="w-6 h-6 text-white drop-shadow-md"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
        </svg>
      </div>
      <div>
        <span className="font-display font-bold text-lg tracking-tight text-slate-800 dark:text-slate-100">
          Petropavl
        </span>
        <span className="font-display font-semibold text-ops-teal dark:text-ops-cyan ml-1.5 tracking-widest text-sm">
          ESC
        </span>
      </div>
    </div>
  );
}
