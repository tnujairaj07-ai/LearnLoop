import { useState, useMemo } from "react";

// Generate deterministic activity data for a given academic year or calendar year
function generateYearActivity(year) {
  const isAcademic = year === "2025-26";
  const startYear = isAcademic ? 2025 : parseInt(year, 10);
  const startMonth = isAcademic ? 5 : 0; // June for academic year, Jan for calendar year
  const startDate = new Date(startYear, startMonth, 1);

  // Align start to the preceding Monday
  const dayOfWeek = startDate.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const calendarStart = new Date(startDate);
  calendarStart.setDate(startDate.getDate() + diffToMonday);

  const totalWeeks = 52;
  const weeks = [];
  let totalQuestions = 0;
  let activeDaysCount = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const topicsList = [
    "Fractions & Decimals",
    "Linear Equations Drill",
    "Polynomial Factorization",
    "Geometry Lines & Angles",
    "Diagnostic Pre-Test",
    "Sign-Rule Practice",
    "Mixed Algebra Review",
  ];

  for (let w = 0; w < totalWeeks; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const currentDate = new Date(calendarStart);
      currentDate.setDate(calendarStart.getDate() + (w * 7 + d));

      const dateStr = currentDate.toISOString().split("T")[0];
      const dayIndex = currentDate.getDay();
      const isWeekend = dayIndex === 0 || dayIndex === 6;

      // Deterministic pseudorandom score based on date hash
      const hash = Math.abs(
        Math.sin(currentDate.getTime() / 86400000) * 10000
      ) % 1;

      let count = 0;
      let level = 0;
      let accuracy = 0;
      let topic = "";

      // Simulate a dedicated student with frequent study days and occasional rest days
      if (isWeekend) {
        if (hash > 0.45) {
          count = Math.floor(hash * 12) + 2;
        }
      } else {
        if (hash > 0.22) {
          count = Math.floor(hash * 18) + 4;
        }
      }

      if (count > 0) {
        activeDaysCount++;
        totalQuestions += count;
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;

        if (count >= 14) level = 4;
        else if (count >= 9) level = 3;
        else if (count >= 5) level = 2;
        else level = 1;

        accuracy = Math.min(100, Math.floor(65 + hash * 35));
        topic = topicsList[Math.floor(hash * topicsList.length)];
      } else {
        tempStreak = 0;
      }

      days.push({
        date: dateStr,
        dateObj: currentDate,
        count,
        level,
        accuracy,
        topic,
      });
    }
    weeks.push(days);
  }

  currentStreak = 12; // Realistic active streak for student

  return {
    weeks,
    totalQuestions,
    activeDaysCount,
    currentStreak,
    longestStreak,
  };
}

export default function GitHubActivityHeatmap() {
  const [selectedYear, setSelectedYear] = useState("2025-26");
  const [hoveredCell, setHoveredCell] = useState(null);

  const {
    weeks,
    totalQuestions,
    activeDaysCount,
    currentStreak,
    longestStreak,
  } = useMemo(() => generateYearActivity(selectedYear), [selectedYear]);

  // Compute month labels aligned with week columns
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;

    weeks.forEach((week, wIndex) => {
      const firstDay = week[0].dateObj;
      const month = firstDay.getMonth();
      if (month !== lastMonth) {
        lastMonth = month;
        const monthName = firstDay.toLocaleString("default", { month: "short" });
        labels.push({ colIndex: wIndex, name: monthName });
      }
    });

    return labels;
  }, [weeks]);

  const levelColors = [
    "bg-slate-100 border-slate-200/60", // 0
    "bg-blue-100 border-blue-200 text-blue-900", // 1
    "bg-blue-300 border-blue-400 text-white", // 2
    "bg-blue-500 border-blue-600 text-white", // 3
    "bg-blue-700 border-blue-800 text-white", // 4
  ];

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
      {/* Top Header: Title, Description & Year Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 tracking-tight">
              Learning Activity & Practice Heatmap
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Daily question attempts, diagnostic assessments, and practice consistency across the year
          </p>
        </div>

        {/* Year Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
          {[
            { id: "2025-26", label: "Session 2025–26" },
            { id: "2025", label: "2025" },
            { id: "2026", label: "2026" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedYear(tab.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedYear === tab.id
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Summary Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Total Questions
          </p>
          <p className="font-display text-xl font-bold text-slate-900 mt-0.5">
            {totalQuestions.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400">Class 9 curriculum</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Active Days
          </p>
          <p className="font-display text-xl font-bold text-blue-600 mt-0.5">
            {activeDaysCount} days
          </p>
          <p className="text-[10px] text-slate-400">Practiced or tested</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Current Streak
          </p>
          <p className="font-display text-xl font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
            <span>{currentStreak} days</span>
            <span className="text-base">🔥</span>
          </p>
          <p className="text-[10px] text-slate-400">Keep it going!</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Longest Streak
          </p>
          <p className="font-display text-xl font-bold text-indigo-600 mt-0.5 flex items-center gap-1">
            <span>{longestStreak} days</span>
            <span className="text-base">🏆</span>
          </p>
          <p className="text-[10px] text-slate-400">Personal best</p>
        </div>
      </div>

      {/* Heatmap Grid Container with Horizontal Scroll for Small Screens */}
      <div className="relative overflow-x-auto pb-2 pt-1">
        <div className="inline-block min-w-max">
          {/* Month Labels Header */}
          <div className="flex text-[11px] font-medium text-slate-400 mb-1.5 pl-8 relative h-4">
            {monthLabels.map((lbl, idx) => (
              <span
                key={idx}
                style={{ position: "absolute", left: `${lbl.colIndex * 15 + 32}px` }}
              >
                {lbl.name}
              </span>
            ))}
          </div>

          {/* Days of Week + Heatmap Cells */}
          <div className="flex gap-1.5 items-start">
            {/* Day of Week Labels (Mon, Wed, Fri) */}
            <div className="flex flex-col gap-1 text-[10px] font-medium text-slate-400 pr-1.5 select-none pt-0.5">
              <span className="h-3 sm:h-3.5 leading-none">Mon</span>
              <span className="h-3 sm:h-3.5 leading-none opacity-0">Tue</span>
              <span className="h-3 sm:h-3.5 leading-none">Wed</span>
              <span className="h-3 sm:h-3.5 leading-none opacity-0">Thu</span>
              <span className="h-3 sm:h-3.5 leading-none">Fri</span>
              <span className="h-3 sm:h-3.5 leading-none opacity-0">Sat</span>
              <span className="h-3 sm:h-3.5 leading-none opacity-0">Sun</span>
            </div>

            {/* 52 Columns of 7 Squares */}
            <div className="flex gap-1">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1">
                  {week.map((day, dIdx) => (
                    <div
                      key={dIdx}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredCell({
                          ...day,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-xs border transition-transform hover:scale-125 cursor-pointer ${
                        levelColors[day.level]
                      }`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer: Heatmap Legend and Help Note */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
        <span>Click or hover on any day square to inspect practice details</span>
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <span>Less</span>
          <span className="w-2.5 h-2.5 rounded-xs bg-slate-100 border border-slate-200/60" />
          <span className="w-2.5 h-2.5 rounded-xs bg-blue-100 border border-blue-200" />
          <span className="w-2.5 h-2.5 rounded-xs bg-blue-300 border border-blue-400" />
          <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 border border-blue-600" />
          <span className="w-2.5 h-2.5 rounded-xs bg-blue-700 border border-blue-800" />
          <span>More</span>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredCell && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-slate-900/95 text-white text-xs rounded-xl py-2 px-3 shadow-xl border border-slate-800 backdrop-blur-xs min-w-44"
          style={{
            left: `${hoveredCell.x}px`,
            top: `${hoveredCell.y - 8}px`,
          }}
        >
          <p className="font-semibold text-slate-100">
            {hoveredCell.dateObj.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          {hoveredCell.count > 0 ? (
            <div className="mt-1 space-y-0.5">
              <p className="text-blue-300 font-medium">
                {hoveredCell.count} questions practiced ({hoveredCell.accuracy}% accuracy)
              </p>
              {hoveredCell.topic && (
                <p className="text-slate-400 text-[10px]">
                  Topic: {hoveredCell.topic}
                </p>
              )}
            </div>
          ) : (
            <p className="text-slate-400 mt-0.5">No learning activity recorded</p>
          )}
        </div>
      )}
    </div>
  );
}
