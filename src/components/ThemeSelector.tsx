import React, { useState, useRef, useEffect } from 'react';
import { useTheme, Theme, AVAILABLE_THEMES } from './ThemeProvider';
import { Palette, Check, Shield, Sparkles, Sun, Moon, Crosshair, Heart } from 'lucide-react';

interface ThemeSelectorProps {
  variant?: 'popover' | 'inline';
  onClose?: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ variant = 'popover', onClose }) => {
  const { theme, setTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (onClose) onClose();
      }
    };
    if (variant === 'popover' && isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [variant, isOpen, onClose]);

  const getThemeIcon = (id: Theme) => {
    switch (id) {
      case 'swat':
        return <Crosshair className="w-4 h-4 text-cyan-400 animate-pulse" />;
      case 'pink':
        return <Heart className="w-4 h-4 text-rose-400" />;
      case 'light':
        return <Sun className="w-4 h-4 text-amber-500" />;
      case 'dark':
      default:
        return <Moon className="w-4 h-4 text-indigo-400" />;
    }
  };

  const getThemeBorderPreview = (id: Theme) => {
    switch (id) {
      case 'swat':
        return 'border-cyan-500/70 shadow-[0_0_12px_rgba(0,240,255,0.3)]';
      case 'pink':
        return 'border-rose-500/70 shadow-[0_0_12px_rgba(244,63,94,0.3)]';
      case 'light':
        return 'border-blue-500/50 shadow-sm';
      case 'dark':
      default:
        return 'border-indigo-500/60 shadow-[0_0_12px_rgba(99,102,241,0.25)]';
    }
  };

  const currentMeta = availableThemes.find((t) => t.id === theme) || availableThemes[0];

  const content = (
    <div className={`w-72 border rounded-2xl shadow-2xl p-2.5 space-y-2 z-50 ${
      theme === 'swat'
        ? 'bg-[#070b12] border-cyan-500/30 text-slate-200'
        : theme === 'pink'
        ? 'bg-[#120718] border-rose-500/30 text-rose-100'
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
    }`}>
      <div className={`flex items-center justify-between px-2.5 py-1.5 border-b ${
        theme === 'swat'
          ? 'border-cyan-500/20 text-cyan-300'
          : theme === 'pink'
          ? 'border-rose-500/20 text-rose-300'
          : 'border-slate-100 dark:border-slate-800/80 text-slate-800 dark:text-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <Palette className={`w-4 h-4 ${theme === 'swat' ? 'text-cyan-400' : theme === 'pink' ? 'text-rose-400' : 'text-indigo-500 dark:text-cyan-400'}`} />
          <span className="text-xs font-bold tracking-wide uppercase">
            Aparência & Temas
          </span>
        </div>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          {availableThemes.length} opções
        </span>
      </div>

      <div className="space-y-1.5">
        {availableThemes.map((item) => {
          const isSelected = theme === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setTheme(item.id);
                if (variant === 'popover') setIsOpen(false);
                if (onClose) onClose();
              }}
              className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                isSelected
                  ? `bg-slate-50 dark:bg-slate-800/90 ${getThemeBorderPreview(item.id)}`
                  : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                    isSelected ? 'border-transparent' : 'border-slate-300 dark:border-slate-700'
                  }`}
                  style={{
                    backgroundColor: item.id === 'light' ? '#f8fafc' : item.id === 'swat' ? '#05080e' : item.id === 'pink' ? '#0d0612' : '#020617',
                  }}
                >
                  {getThemeIcon(item.id)}
                </div>

                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {item.name}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${item.badgeBg} ${item.badgeText}`}>
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-snug">
                    {item.description}
                  </p>
                </div>
              </div>

              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 ml-2">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {theme === 'swat' && (
        <div className="px-2.5 py-1.5 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-[10px] font-mono text-cyan-300 flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-cyan-400 shrink-0" />
          <span>[ S.W.A.T. TAC-OPS HUD // CALIBRADO PELA TWISTED MEDIA ]</span>
        </div>
      )}

      {theme === 'pink' && (
        <div className="px-2.5 py-1.5 bg-rose-950/40 border border-rose-500/30 rounded-xl text-[10px] text-rose-300 flex items-center gap-1.5 font-medium">
          <Heart className="w-3 h-3 text-rose-400 shrink-0" />
          <span>[ TEMA PINK FOCUS // CONTRASTE & CONCENTRAÇÃO ]</span>
        </div>
      )}
    </div>
  );

  if (variant === 'inline') {
    return content;
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-xs ${
          theme === 'swat'
            ? 'bg-cyan-950/40 hover:bg-cyan-950/70 border-cyan-500/30 text-cyan-200'
            : theme === 'pink'
            ? 'bg-rose-950/40 hover:bg-rose-950/70 border-rose-500/30 text-rose-200'
            : 'border-slate-200 dark:border-slate-700/80 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
        }`}
        title="Alterar Tema Visual do SYNAPSE"
      >
        <div className="flex items-center justify-center">
          {getThemeIcon(theme)}
        </div>
        <span className="hidden sm:inline font-bold text-[11px]">{currentMeta.name.split(' ')[0]}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {content}
        </div>
      )}
    </div>
  );
};
