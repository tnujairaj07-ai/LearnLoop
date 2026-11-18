import { useState, useMemo } from "react";

function buildGridFromDays(daysArray = [], selectedRange = "rolling") {
  const dayMap = new Map();
  daysArray.forEach((d) => {
    if (d && d.date) dayMap.set(String(d.date), d);
  });

  const today = new Date();
  let startDate;
  if (selectedRange === "rolling") {
    startDate = new Date(today);
    startDate.setDate(today.getDate() - 363);
  } else {
    const yearNum = parseInt(selectedRange, 10) || today.getFullYear();
    startDate = new Date(yearNum, 0, 1);
  }

  // Align start to Monday
  const dayOfWeek = startDate.getDay(); // 0=Sun, 1=Mon
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const calendarStart = new Date(startDate);
  calendarStart.setDate(startDate.getDate() + diffToMonday);

  const totalWeeks = 52;
  const weeks = [];
  let rangeQuestions = 0;
  let rangeActiveDays = 0;

  for (let w = 0; w < totalWeeks; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const currentDate = new Date(calendarStart);
      currentDate.setDate(calendarStart.getDate() + (w * 7 + d));
      const yyyy = currentDate.getFullYear();
      const mm = String(currentDate.getMonth() + 1).padStart(2, "0");
      const dd = String(currentDate.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const rec = dayMap.get(dateStr);
      const count = Number(rec?.count ?? 0);
      const accuracy = Math.round(Number(rec?.accuracy ?? 0));
      let level = Number(rec?.level ?? 0);
      if (!rec?.level && count > 0) {
        if (count >= 14) level = 4;
        else if (count >= 9) level = 3;
        else if (count >= 5) level = 2;
        else level = 1;
      }

      if (count > 0 || Number(rec?.tasks_completed ?? 0) > 0 || Number(rec?.active_minutes ?? 0) > 0) {
        rangeActiveDays += 1;
        rangeQuestions += count;
      }

      days.push({
        date: dateStr,
        dateObj: currentDate,
        count,
        level: Math.min(4, Math.max(0, level)),
        accuracy,
        topic: rec?.topic || "",
        activeMinutes: Number(rec?.active_minutes ?? 0),
        tasksCompleted: Number(rec?.tasks_completed ?? 0),
      });
    }
    weeks.push(days);
  }

  return { weeks, rangeQuestions, rangeActiveDays };
}

export default function GitHubActivityHeatmap({ heatmapData = null }) {
  const currentYear = new Date().getFullYear();
  const [selectedRange, setSelectedRange] = useState("rolling");
  const [hoveredCell, setHoveredCell] = useState(null);

  const { weeks, rangeQuestions, rangeActiveDays } = useMemo(
    () => buildGridFromDays(heatmapData?.days || [], selectedRange),
    [heatmapData, selectedRange]
  );

  const totalQuestions =
    selectedRange === "rolling"
      ? Number(heatmapData?.total_questions ?? rangeQuestions)
      : rangeQuestions;
  const activeDaysCount =
    selectedRange === "rolling"
      ? Number(heatmapData?.active_days_count ?? rangeActiveDays)
      : rangeActiveDays;
  const currentStreak = Number(heatmapData?.current_streak ?? 0);
  const longestStreak = Number(heatmapData?.longest_streak ?? 0);

  // Month labels aligned with week columns
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    weeks.forEach((week, wIndex) => {
      const firstDay = week[0]?.dateObj;
      if (!firstDay) return;
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
    "bg-slate-100 border-slate-200/60",
    "bg-blue-100 border-blue-200 text-blue-900",
    "bg-blue-300 border-blue-400 text-white",
    "bg-blue-500 border-blue-600 text-white",
    "bg-blue-700 border-blue-800 text-white",
  ];

  const tabs = [
    { id: "rolling", label: "Last 12 Months" },
    { id: String(currentYear), label: String(currentYear) },
    { id: String(currentYear - 1), label: String(currentYear - 1) },
  ];

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 tracking-tight">
              Learning Activity &amp; Practice Heatmap
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Daily question attempts, diagnostic assessments, and study consistency
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedRange(tab.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedRange === tab.id
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
          <p className="text-[10px] text-slate-400">Logged questions</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Active Days
          </p>
          <p className="font-display text-xl font-bold text-blue-600 mt-0.5">
            {activeDaysCount} {activeDaysCount === 1 ? "day" : "days"}
          </p>
          <p className="text-[10px] text-slate-400">Practiced or tested</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Current Streak
          </p>
          <p className="font-display text-xl font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
            <span>{currentStreak} days</span>
            {currentStreak > 0 && <span className="text-base">🔥</span>}
          </p>
          <p className="text-[10px] text-slate-400">
            {currentStreak > 0 ? "Keep it going!" : "Start practicing today"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Longest Streak
          </p>
          <p className="font-display text-xl font-bold text-indigo-600 mt-0.5 flex items-center gap-1">
            <span>{longestStreak} days</span>
            {longestStreak > 0 && <span className="text-base">🏆</span>}
          </p>
          <p className="text-[10px] text-slate-400">Personal best</p>
        </div>
      </div>

      {/* Heatmap Grid Container */}
      <div className="relative overflow-x-auto pb-2 pt-1">
        <div className="inline-block min-w-max">
          <div className="flex text-[11px] font-medium text-slate-400 mb-1.5 pl-8 relative h-4">
            {monthLabels.map((lbl, idx) => (
              <span
                key={idx}
                style={{
                  position: "absolute",
                  left: `${lbl.colIndex * 15 + 32}px`,
                }}
              >
                {lbl.name}
              </span>
            ))}
          </div>

          <div className="flex gap-1.5 items-start">
            <div className="flex flex-col gap-1 text-[10px] font-medium text-slate-400 pr-1.5 select-none pt-0.5">
              <span className="h-3 sm:h-3.5 leading-none">Mon</span>
              <span className="h-3 sm:h-3.5 leading-none opacity-0">Tue</span>
              <span className="h-3 sm:h-3.5 leading-none">Wed</span>
              <span className="h-3 sm:h-3.5 leading-none opacity-0">Thu</span>
              <span className="h-3 sm:h-3.5 leading-none">Fri</span>
              <span className="h-3 sm:h-3.5 leading-none opacity-0">Sat</span>
              <span className="h-3 sm:h-3.5 leading-none opacity-0">Sun</span>
            </div>

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

      {/* Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
        <span>Hover over any day square to inspect recorded practice activity</span>
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

      {/* Hover Tooltip */}
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
          {hoveredCell.count > 0 || hoveredCell.activeMinutes > 0 ? (
            <div className="mt-1 space-y-0.5">
              <p className="text-blue-300 font-medium">
                {hoveredCell.count} questions · {hoveredCell.activeMinutes}m active
                {hoveredCell.accuracy > 0 ? ` (${hoveredCell.accuracy}% acc)` : ""}
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
