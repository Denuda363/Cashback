import React, { useEffect, useRef, useState } from 'react';
import { CalendarCheck2, MoonStar, Sun, Sunrise, Sunset } from 'lucide-react';

interface LiveClockBannerProps {
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
  if (hours >= 5 && hours < 11) return { label: 'Pagi', Icon: Sunrise, accentText: 'text-amber-300' };
  if (hours >= 11 && hours < 15) return { label: 'Siang', Icon: Sun, accentText: 'text-amber-300' };
  if (hours >= 15 && hours < 18) return { label: 'Sore', Icon: Sunset, accentText: 'text-orange-300' };
  return { label: 'Malam', Icon: MoonStar, accentText: 'text-sky-300' };
};

export const LiveClockBanner: React.FC<LiveClockBannerProps> = ({
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

  // Track minute wraps so the SVG second hand sweeps clockwise across 59 -> 00 without rewinding
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
        // Ignore storage write error
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

  return (
    <section
      aria-label="Jam dan tanggal langsung"
      className="bg-slate-900 text-white rounded-xl border border-slate-700/80 shadow-sm px-3 py-1.5 sm:px-4 sm:py-2 mb-2.5 sm:mb-3.5 relative overflow-hidden print:hidden"
    >
      {/* Subtle ambient depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-full bg-emerald-500/15 blur-xl"
      />

      <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Compact Precision Analog Dial + Day & Date */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mini 3D Analog Watch Dial */}
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center">
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full p-[1px] opacity-85"
              style={{
                background:
                  'conic-gradient(from 0deg, rgba(52,211,153,0.8), rgba(56,189,248,0.45), rgba(255,255,255,0.25), rgba(16,185,129,0.8))',
              }}
            >
              <div className="w-full h-full rounded-full bg-slate-950" />
            </div>

            <svg viewBox="0 0 100 100" className="relative z-10 w-6 h-6 sm:w-7 sm:h-7" aria-hidden="true">
              <circle cx="50" cy="50" r="45" fill="#090f1d" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
              {[0, 90, 180, 270].map((deg) => (
                <line
                  key={deg}
                  x1="50"
                  y1="10"
                  x2="50"
                  y2="18"
                  stroke="#34d399"
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
                stroke="#f8fafc"
                strokeWidth="5"
                strokeLinecap="round"
                style={{ transform: `rotate(${hourDeg}deg)`, transformOrigin: '50px 50px' }}
              />
              <line
                x1="50"
                y1="54"
                x2="50"
                y2="18"
                stroke="#cbd5e1"
                strokeWidth="3.5"
                strokeLinecap="round"
                style={{ transform: `rotate(${minuteDeg}deg)`, transformOrigin: '50px 50px' }}
              />
              <line
                x1="50"
                y1="60"
                x2="50"
                y2="13"
                stroke="#34d399"
                strokeWidth="2.2"
                strokeLinecap="round"
                style={{
                  transform: `rotate(${secondDeg}deg)`,
                  transformOrigin: '50px 50px',
                  transition: 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
              <circle cx="50" cy="50" r="4.5" fill="#10b981" stroke="#f8fafc" strokeWidth="1.5" />
            </svg>
          </div>

          {/* Single-Line Day & Date */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 text-xs sm:text-[13px]">
            <GreetingIcon className={`w-3.5 h-3.5 shrink-0 hidden sm:inline ${greeting.accentText}`} />
            <span className="font-extrabold text-emerald-300 tracking-tight shrink-0">{dayName},</span>
            <span className="font-semibold text-white truncate sm:hidden tabular-nums">
              {dayNumber} {monthShort} {year}
            </span>
            <span className="hidden sm:inline font-semibold text-white whitespace-nowrap tabular-nums">
              {dayNumber} {monthFull} {year}
            </span>
            <span aria-hidden="true" className="hidden md:inline text-slate-600">·</span>
            <span className="hidden md:inline text-[11px] font-medium text-slate-400 whitespace-nowrap">
              Selamat {greeting.label}
            </span>
          </div>
        </div>

        {/* Right: Sleek Digital Readout + Micro Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Compact Digital Time */}
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

          <span aria-hidden="true" className="hidden sm:inline-block w-px h-4 bg-slate-700/80" />

          {/* Format Toggle */}
          <button
            type="button"
            onClick={handleToggleFormat}
            title={is24Hour ? 'Ubah ke format 12 Jam (AM/PM)' : 'Ubah ke format 24 Jam'}
            aria-label={is24Hour ? 'Format 24 Jam aktif' : 'Format 12 Jam aktif'}
            className="h-7 px-2 rounded-lg border border-slate-700/90 bg-slate-800/80 hover:bg-slate-700 text-[10px] font-mono font-bold text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {is24Hour ? '24J' : '12J'}
          </button>

          {/* Quick Today Filter */}
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
                isTodayFilterActive
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 hover:bg-emerald-400'
                  : 'bg-slate-800/80 text-slate-200 border-slate-700/90 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <CalendarCheck2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{isTodayFilterActive ? 'Hari Ini ✓' : 'Hari Ini'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Ultra-thin 60s Sweep Filament tucked cleanly along the bottom border */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-slate-800/80 overflow-hidden"
      >
        <div
          className="h-full w-full origin-left bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 transition-transform duration-300 ease-out"
          style={{ transform: `scaleX(${secondProgressRatio})` }}
        />
      </div>
    </section>
  );
};
