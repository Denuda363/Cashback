import React, { useEffect, useRef, useState } from 'react';
import { CalendarCheck2, MoonStar, Sun, Sunrise, Sunset } from 'lucide-react';
import { ClockStyle } from '../types/cashback';

interface LiveClockBannerProps {
  clockStyle?: ClockStyle;
  isTodayFilterActive?: boolean;
  onToggleTodayFilter?: () => void;
}

const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
const BULAN_SHORT_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const CLOCK_FORMAT_STORAGE_KEY = 'cashback_clock_24h_v1';

const getTimezoneCode = (): string => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === 'Asia/Jakarta' || tz === 'Asia/Pontianak') return 'WIB';
    if (tz === 'Asia/Makassar' || tz === 'Asia/Ujung_Pandang') return 'WITA';
    if (tz === 'Asia/Jayapura') return 'WIT';
  } catch {
    // Fallback below
  }
  const offsetHours = -new Date().getTimezoneOffset() / 60;
  if (offsetHours === 7) return 'WIB';
  if (offsetHours === 8) return 'WITA';
  if (offsetHours === 9) return 'WIT';
  const sign = offsetHours >= 0 ? '+' : '';
  return `GMT${sign}${offsetHours}`;
};

const getGreetingInfo = (hours: number) => {
  if (hours >= 5 && hours < 11) return { label: 'Pagi', Icon: Sunrise, darkAccent: 'text-amber-300', lightAccent: 'text-amber-600' };
  if (hours >= 11 && hours < 15) return { label: 'Siang', Icon: Sun, darkAccent: 'text-amber-300', lightAccent: 'text-amber-600' };
  if (hours >= 15 && hours < 18) return { label: 'Sore', Icon: Sunset, darkAccent: 'text-orange-300', lightAccent: 'text-orange-600' };
  return { label: 'Malam', Icon: MoonStar, darkAccent: 'text-sky-300', lightAccent: 'text-indigo-600' };
};

export const LiveClockBanner: React.FC<LiveClockBannerProps> = ({
  clockStyle = 'chronograph',
  isTodayFilterActive = false,
  onToggleTodayFilter,
}) => {
  const [now, setNow] = useState<Date>(() => new Date());
  const [is24Hour, setIs24Hour] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(CLOCK_FORMAT_STORAGE_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  // Track minute wraps so SVG rotating hands never rewind 354deg at :59 -> :00
  const prevSecRef = useRef<number>(now.getSeconds());
  const lapRef = useRef<number>(0);

  useEffect(() => {
    let intervalId: number | undefined;
    const alignDelay = Math.max(20, 1000 - (Date.now() % 1000));

    const tick = () => {
      const current = new Date();
      const sec = current.getSeconds();
      if (sec < prevSecRef.current) {
        lapRef.current += 1;
      }
      prevSecRef.current = sec;
      setNow(current);
    };

    const alignTimeout = window.setTimeout(() => {
      tick();
      intervalId = window.setInterval(tick, 1000);
    }, alignDelay);

    return () => {
      window.clearTimeout(alignTimeout);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, []);

  const handleToggleFormat = () => {
    setIs24Hour((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(CLOCK_FORMAT_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const hours24 = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const dayName = HARI_ID[now.getDay()];
  const dayNumber = now.getDate();
  const monthFull = BULAN_ID[now.getMonth()];
  const monthShort = BULAN_SHORT_ID[now.getMonth()];
  const year = now.getFullYear();
  const timezone = getTimezoneCode();
  const greeting = getGreetingInfo(hours24);
  const GreetingIcon = greeting.Icon;

  const displayHours = is24Hour
    ? String(hours24).padStart(2, '0')
    : String(hours24 % 12 || 12).padStart(2, '0');
  const displayMinutes = String(minutes).padStart(2, '0');
  const displaySeconds = String(seconds).padStart(2, '0');
  const periodLabel = hours24 >= 12 ? 'PM' : 'AM';

  // Analog horology hand angles
  const hourDeg = ((hours24 % 12) + minutes / 60) * 30;
  const minuteDeg = (minutes + seconds / 60) * 6;
  const secondDeg = (lapRef.current * 60 + seconds) * 6;
  const secondProgressRatio = (seconds + 1) / 60;

  const isLightShell = clockStyle === 'ivory_card' || clockStyle === 'ultra_typo';

  // Outer shell classes calibrated per style while keeping 3D compatibility
  const shellClassMap: Record<ClockStyle, string> = {
    chronograph:
      'bg-slate-900 text-white border-slate-700/80 shadow-sm',
    ivory_card:
      'bg-white text-slate-900 border-slate-200/90 shadow-xs',
    flip_split:
      'bg-slate-900 text-white border-slate-700/90 shadow-sm',
    nixie_amber:
      'bg-stone-950 text-amber-50 border-amber-900/50 shadow-sm',
    emerald_matrix:
      'bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-emerald-50 border-emerald-500/35 shadow-sm',
    ultra_typo:
      'bg-white/85 backdrop-blur-md text-slate-900 border-slate-200/80 shadow-2xs',
  };

  const renderLeftVisualEmblem = () => {
    if (clockStyle === 'flip_split') {
      // Mini calendar page leaf showing today's date number
      return (
        <div
          aria-hidden="true"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800 border border-slate-600/80 shadow-inner flex flex-col overflow-hidden shrink-0"
        >
          <div className="h-2 bg-emerald-500 w-full flex items-center justify-center">
            <span className="text-[5px] font-extrabold tracking-widest uppercase text-slate-950 leading-none">
              {monthShort}
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center font-mono font-extrabold text-[11px] sm:text-xs text-white tabular-nums leading-none">
            {String(dayNumber).padStart(2, '0')}
          </div>
        </div>
      );
    }

    if (clockStyle === 'ultra_typo') {
      return (
        <span
          aria-hidden="true"
          className="w-[3px] h-5 rounded-full bg-emerald-600 shrink-0"
        />
      );
    }

    if (clockStyle === 'emerald_matrix') {
      // Concentric HUD radar watch dial
      return (
        <div className="relative w-7 h-7 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true">
            <circle cx="50" cy="50" r="45" fill="rgba(6,78,59,0.45)" stroke="rgba(52,211,153,0.45)" strokeWidth="2.5" />
            <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(52,211,153,0.22)" strokeWidth="1.5" strokeDasharray="4 4" />
            <g
              style={{
                transform: `rotate(${secondDeg}deg)`,
                transformOrigin: '50px 50px',
                transition: 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <path d="M50,50 L50,8 A42,42 0 0,1 74,16 Z" fill="rgba(52,211,153,0.28)" />
              <line x1="50" y1="50" x2="50" y2="9" stroke="#34d399" strokeWidth="2.8" strokeLinecap="round" />
            </g>
            <circle cx="50" cy="50" r="4.5" fill="#6ee7b7" />
          </svg>
        </div>
      );
    }

    // Analog watch dial tuned for chronograph, ivory_card, or nixie_amber
    const isIvory = clockStyle === 'ivory_card';
    const isNixie = clockStyle === 'nixie_amber';
    const bezelGradient = isIvory
      ? 'conic-gradient(from 0deg, #10b981, #94a3b8, #cbd5e1, #059669)'
      : isNixie
        ? 'conic-gradient(from 0deg, #f59e0b, #78350f, #fbbf24, #b45309)'
        : 'conic-gradient(from 0deg, rgba(52,211,153,0.85), rgba(56,189,248,0.45), rgba(255,255,255,0.25), rgba(16,185,129,0.85))';
    const dialFill = isIvory ? '#f8fafc' : isNixie ? '#1c1917' : '#090f1d';
    const tickColor = isIvory ? '#059669' : isNixie ? '#fbbf24' : '#34d399';
    const hourColor = isIvory ? '#0f172a' : isNixie ? '#fef3c7' : '#f8fafc';
    const minColor = isIvory ? '#475569' : isNixie ? '#fcd34d' : '#cbd5e1';
    const secColor = isIvory ? '#059669' : isNixie ? '#f97316' : '#34d399';

    return (
      <div className="relative w-7 h-7 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center">
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full p-[1px] opacity-90"
          style={{ background: bezelGradient }}
        >
          <div className={`w-full h-full rounded-full ${isIvory ? 'bg-white' : isNixie ? 'bg-stone-950' : 'bg-slate-950'}`} />
        </div>

        <svg viewBox="0 0 100 100" className="relative z-10 w-6 h-6 sm:w-7 sm:h-7" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill={dialFill}
            stroke={isIvory ? '#cbd5e1' : 'rgba(255,255,255,0.14)'}
            strokeWidth="2"
          />
          {[0, 90, 180, 270].map((deg) => (
            <line
              key={deg}
              x1="50"
              y1="10"
              x2="50"
              y2="18"
              stroke={tickColor}
              strokeWidth="3.5"
              strokeLinecap="round"
              transform={`rotate(${deg} 50 50)`}
            />
          ))}
          <line
            x1="50"
            y1="52"
            x2="50"
            y2="27"
            stroke={hourColor}
            strokeWidth="5"
            strokeLinecap="round"
            style={{ transform: `rotate(${hourDeg}deg)`, transformOrigin: '50px 50px' }}
          />
          <line
            x1="50"
            y1="54"
            x2="50"
            y2="18"
            stroke={minColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            style={{ transform: `rotate(${minuteDeg}deg)`, transformOrigin: '50px 50px' }}
          />
          <line
            x1="50"
            y1="60"
            x2="50"
            y2="13"
            stroke={secColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            style={{
              transform: `rotate(${secondDeg}deg)`,
              transformOrigin: '50px 50px',
              transition: 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
          <circle cx="50" cy="50" r="4.5" fill={secColor} stroke={hourColor} strokeWidth="1.5" />
        </svg>
      </div>
    );
  };

  const renderDigitalClock = () => {
    if (clockStyle === 'flip_split') {
      const colonCls = `text-xs sm:text-sm font-bold transition-opacity duration-200 ${
        seconds % 2 === 0 ? 'text-emerald-400 opacity-100' : 'text-emerald-400 opacity-35'
      }`;
      const tileCls =
        'relative inline-flex items-center justify-center min-w-[24px] sm:min-w-[27px] h-6 sm:h-[26px] px-1 rounded-md bg-slate-800 border border-slate-600/80 shadow-inner font-mono tabular-nums text-xs sm:text-sm font-extrabold text-white overflow-hidden';
      const seamCls = 'pointer-events-none absolute inset-x-0 top-1/2 h-px bg-slate-950/75';
      return (
        <div className="flex items-center gap-0.5 sm:gap-1 font-mono tabular-nums leading-none">
          <span className={tileCls}>
            <span className="relative z-10">{displayHours}</span>
            <span aria-hidden="true" className={seamCls} />
          </span>
          <span aria-hidden="true" className={colonCls}>:</span>
          <span className={tileCls}>
            <span className="relative z-10">{displayMinutes}</span>
            <span aria-hidden="true" className={seamCls} />
          </span>
          <span aria-hidden="true" className={colonCls}>:</span>
          <span className="relative inline-flex items-center justify-center min-w-[22px] sm:min-w-[25px] h-6 sm:h-[26px] px-1 rounded-md bg-emerald-950/90 border border-emerald-500/45 shadow-inner font-mono tabular-nums text-[11px] sm:text-xs font-extrabold text-emerald-300 overflow-hidden">
            <span className="relative z-10">{displaySeconds}</span>
            <span aria-hidden="true" className={seamCls} />
          </span>
          {!is24Hour && (
            <span className="ml-1 text-[9px] font-bold text-slate-300">{periodLabel}</span>
          )}
          <span className="hidden sm:inline ml-1 text-[10px] font-semibold text-slate-400">{timezone}</span>
        </div>
      );
    }

    if (clockStyle === 'nixie_amber') {
      return (
        <div className="flex items-baseline font-mono tabular-nums leading-none">
          <span className="text-sm sm:text-base font-extrabold tracking-wide text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.45)]">
            {displayHours}
          </span>
          <span
            aria-hidden="true"
            className={`mx-[1px] text-sm sm:text-base font-bold transition-opacity duration-200 ${
              seconds % 2 === 0 ? 'text-amber-400 opacity-100' : 'text-amber-500 opacity-35'
            }`}
          >
            :
          </span>
          <span className="text-sm sm:text-base font-extrabold tracking-wide text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.45)]">
            {displayMinutes}
          </span>
          <span className="text-[11px] sm:text-xs font-bold text-orange-400 ml-[1px]">
            :{displaySeconds}
          </span>
          {!is24Hour && (
            <span className="ml-1 text-[9px] sm:text-[10px] font-bold text-amber-200/80">{periodLabel}</span>
          )}
          <span className="hidden sm:inline ml-1.5 text-[10px] font-semibold text-amber-400/75">{timezone}</span>
        </div>
      );
    }

    if (clockStyle === 'ivory_card' || clockStyle === 'ultra_typo') {
      return (
        <div className="flex items-baseline font-mono tabular-nums leading-none">
          <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900">
            {displayHours}
          </span>
          <span
            aria-hidden="true"
            className={`mx-[1px] text-sm sm:text-base font-bold transition-opacity duration-200 ${
              seconds % 2 === 0 ? 'text-emerald-600 opacity-100' : 'text-emerald-600 opacity-35'
            }`}
          >
            :
          </span>
          <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900">
            {displayMinutes}
          </span>
          <span className="text-[11px] sm:text-xs font-bold text-emerald-600 ml-[1px]">
            :{displaySeconds}
          </span>
          {!is24Hour && (
            <span className="ml-1 text-[9px] sm:text-[10px] font-bold text-slate-500">{periodLabel}</span>
          )}
          <span className="hidden sm:inline ml-1.5 text-[10px] font-semibold text-slate-500">{timezone}</span>
        </div>
      );
    }

    if (clockStyle === 'emerald_matrix') {
      return (
        <div className="flex items-center gap-2">
          {/* 5-bar micro rhythm indicator */}
          <div aria-hidden="true" className="hidden md:flex items-end gap-[2px] h-3.5">
            {[0, 1, 2, 3, 4].map((bar) => {
              const active = seconds % 5 === bar;
              return (
                <span
                  key={bar}
                  className={`w-[2.5px] rounded-full transition-all duration-200 ${
                    active ? 'h-3.5 bg-emerald-300' : 'h-1.5 bg-emerald-700/70'
                  }`}
                />
              );
            })}
          </div>
          <div className="flex items-baseline font-mono tabular-nums leading-none">
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-emerald-100">
              {displayHours}
            </span>
            <span
              aria-hidden="true"
              className={`mx-[1px] text-sm sm:text-base font-bold transition-opacity duration-200 ${
                seconds % 2 === 0 ? 'text-emerald-400 opacity-100' : 'text-emerald-400 opacity-35'
              }`}
            >
              :
            </span>
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-emerald-100">
              {displayMinutes}
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-teal-300 ml-[1px]">
              :{displaySeconds}
            </span>
            {!is24Hour && (
              <span className="ml-1 text-[9px] sm:text-[10px] font-bold text-emerald-300/80">{periodLabel}</span>
            )}
            <span className="hidden sm:inline ml-1.5 text-[10px] font-semibold text-emerald-400/80">{timezone}</span>
          </div>
        </div>
      );
    }

    // Default: 'chronograph'
    return (
      <div className="flex items-baseline font-mono tabular-nums leading-none">
        <span className="text-sm sm:text-base font-extrabold tracking-tight text-white">
          {displayHours}
        </span>
        <span
          aria-hidden="true"
          className={`mx-[1px] text-sm sm:text-base font-bold transition-opacity duration-200 ${
            seconds % 2 === 0 ? 'text-emerald-400 opacity-100' : 'text-emerald-400 opacity-40'
          }`}
        >
          :
        </span>
        <span className="text-sm sm:text-base font-extrabold tracking-tight text-white">
          {displayMinutes}
        </span>
        <span className="text-[11px] sm:text-xs font-bold text-emerald-300 ml-[1px]">
          :{displaySeconds}
        </span>
        {!is24Hour && (
          <span className="ml-1 text-[9px] sm:text-[10px] font-bold text-slate-300">{periodLabel}</span>
        )}
        <span className="hidden sm:inline ml-1.5 text-[10px] font-semibold text-slate-400">{timezone}</span>
      </div>
    );
  };

  // Text & control styling per light vs dark/nixie chassis
  const dayTextCls =
    clockStyle === 'nixie_amber'
      ? 'text-amber-300'
      : isLightShell
        ? 'text-emerald-700'
        : 'text-emerald-300';
  const dateTextCls =
    clockStyle === 'nixie_amber'
      ? 'text-stone-100'
      : isLightShell
        ? 'text-slate-900'
        : 'text-white';
  const greetingTextCls =
    clockStyle === 'nixie_amber'
      ? 'text-amber-200/70'
      : isLightShell
        ? 'text-slate-500'
        : 'text-slate-400';
  const dividerCls = isLightShell ? 'bg-slate-200' : 'bg-slate-700/80';

  const formatBtnCls = isLightShell
    ? 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
    : clockStyle === 'nixie_amber'
      ? 'border-amber-800/70 bg-stone-900 hover:bg-stone-800 text-amber-200'
      : 'border-slate-700/90 bg-slate-800/80 hover:bg-slate-700 text-slate-200';

  const todayBtnInactiveCls = isLightShell
    ? 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
    : clockStyle === 'nixie_amber'
      ? 'border-amber-800/70 bg-stone-900 hover:bg-stone-800 text-amber-200'
      : 'border-slate-700/90 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white';

  const todayBtnActiveCls =
    clockStyle === 'nixie_amber'
      ? 'bg-amber-400 text-stone-950 border-amber-300 hover:bg-amber-300'
      : 'bg-emerald-500 text-slate-950 border-emerald-400 hover:bg-emerald-400';

  const filamentGradient =
    clockStyle === 'nixie_amber'
      ? 'from-amber-500 via-orange-400 to-yellow-300'
      : isLightShell
        ? 'from-emerald-600 via-teal-500 to-sky-500'
        : 'from-emerald-400 via-teal-300 to-sky-400';

  return (
    <section
      aria-label="Jam dan tanggal langsung"
      className={`${shellClassMap[clockStyle]} rounded-xl border px-3 py-1.5 sm:px-4 sm:py-2 mb-2.5 sm:mb-3.5 relative overflow-hidden transition-colors print:hidden`}
    >
      <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Style-Specific Horology Emblem + Single-Line Day & Date */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {renderLeftVisualEmblem()}

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 text-xs sm:text-[13px]">
            <GreetingIcon
              className={`w-3.5 h-3.5 shrink-0 hidden sm:inline ${
                isLightShell ? greeting.lightAccent : greeting.darkAccent
              }`}
            />
            <span className={`font-extrabold tracking-tight shrink-0 ${dayTextCls}`}>
              {dayName},
            </span>
            <span className={`font-semibold truncate sm:hidden tabular-nums ${dateTextCls}`}>
              {dayNumber} {monthShort} {year}
            </span>
            <span className={`hidden sm:inline font-semibold whitespace-nowrap tabular-nums ${dateTextCls}`}>
              {dayNumber} {monthFull} {year}
            </span>
            <span aria-hidden="true" className={`hidden md:inline ${isLightShell ? 'text-slate-300' : 'text-slate-600'}`}>
              ·
            </span>
            <span className={`hidden md:inline text-[11px] font-medium whitespace-nowrap ${greetingTextCls}`}>
              Selamat {greeting.label}
            </span>
          </div>
        </div>

        {/* Right: Style-Specific Digital Readout + Micro Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {renderDigitalClock()}

          <span aria-hidden="true" className={`hidden sm:inline-block w-px h-4 ${dividerCls}`} />

          <button
            type="button"
            onClick={handleToggleFormat}
            title={is24Hour ? 'Ubah ke format 12 Jam (AM/PM)' : 'Ubah ke format 24 Jam'}
            aria-label={is24Hour ? 'Format 24 Jam aktif' : 'Format 12 Jam aktif'}
            className={`h-7 px-2 rounded-lg border text-[10px] font-mono font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${formatBtnCls}`}
          >
            {is24Hour ? '24J' : '12J'}
          </button>

          {onToggleTodayFilter && (
            <button
              type="button"
              onClick={onToggleTodayFilter}
              title={
                isTodayFilterActive
                  ? 'Tampilkan semua tanggal'
                  : 'Filter data transaksi hari ini'
              }
              aria-label={isTodayFilterActive ? 'Nonaktifkan filter hari ini' : 'Filter transaksi hari ini'}
              className={`h-7 px-2 sm:px-2.5 flex items-center gap-1 rounded-lg border text-[10px] sm:text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isTodayFilterActive ? todayBtnActiveCls : todayBtnInactiveCls
              }`}
            >
              <CalendarCheck2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{isTodayFilterActive ? 'Hari Ini ✓' : 'Hari Ini'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Ultra-thin 60s Sweep Filament tucked along the bottom border */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden ${
          isLightShell ? 'bg-slate-200/70' : 'bg-slate-800/80'
        }`}
      >
        <div
          className={`h-full w-full origin-left bg-gradient-to-r ${filamentGradient} transition-transform duration-300 ease-out`}
          style={{ transform: `scaleX(${secondProgressRatio})` }}
        />
      </div>
    </section>
  );
};
