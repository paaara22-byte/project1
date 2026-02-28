import { useLang } from "../contexts/LangContext";

export function LangToggle() {
  const { lang, setLanguage } = useLang();

  return (
    <div className="flex rounded-xl overflow-hidden border border-white/20 dark:border-white/10 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-sm p-0.5 shrink-0">
      <button
        type="button"
        onClick={() => setLanguage("kz")}
        className={`relative px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-semibold transition-all duration-250 ease-out rounded-lg ${
          lang === "kz"
            ? "text-white bg-gradient-to-r from-ops-blue to-ops-teal shadow-glow"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
        }`}
      >
        {lang === "kz" && (
          <span
            className="absolute inset-0 rounded-lg bg-gradient-to-r from-ops-blue to-ops-teal animate-slide-lang"
            aria-hidden
          />
        )}
        <span className="relative">KZ</span>
      </button>
      <button
        type="button"
        onClick={() => setLanguage("ru")}
        className={`relative px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-semibold transition-all duration-250 ease-out rounded-lg ${
          lang === "ru"
            ? "text-white bg-gradient-to-r from-ops-blue to-ops-teal shadow-glow"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
        }`}
      >
        {lang === "ru" && (
          <span
            className="absolute inset-0 rounded-lg bg-gradient-to-r from-ops-blue to-ops-teal animate-slide-lang"
            aria-hidden
          />
        )}
        <span className="relative">RU</span>
      </button>
    </div>
  );
}
