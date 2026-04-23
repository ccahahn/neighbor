import { useEffect, useMemo, useState } from "react";
import {
  Users,
  ClipboardList,
  Calendar,
  BookOpen,
  ChevronLeft,
  Search,
  Filter,
  ShieldCheck,
  ArrowRight,
  Heart,
  Lock,
  X,
  EyeOff,
  Eye,
  ExternalLink,
  Globe,
} from "lucide-react";
import {
  STUDENTS,
  MATCHES_BY_STUDENT,
  LOS_PENASQUITOS_ELEMENTARY,
  isWalkingBuddyCandidate,
  qualifiesForNeighbor,
  attendanceBadge,
} from "./data";
import GoogleMapView from "./GoogleMapView";

// Deep link to the full Google Maps app for the currently-selected helper
// route. Same helper → student → school path as the embedded iframe, but
// opens in a new tab where the VP can send-to-phone or drop into Street
// View. Also used when no helper is selected: just student → school.
function buildMapsRouteUrl(student, selectedMatch) {
  const coord = (p) => `${p.lat},${p.lng}`;
  const kidLocation = student.address
    ? `${student.address}, San Diego, CA 92129`
    : coord(student.home);
  const params = new URLSearchParams({
    api: "1",
    origin: selectedMatch ? coord(selectedMatch.coords) : kidLocation,
    destination: LOS_PENASQUITOS_ELEMENTARY.address,
    travelmode: "walking",
  });
  if (selectedMatch) params.set("waypoints", kidLocation);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

const MESSAGE_TEMPLATE =
  "Hi! Ms. Reese here from Los Peñasquitos Elementary. We are matching families to walk together as part of our walking buddy program (you opted in during school registration). We have a family in mind. Would you be up for meeting them?";

// Hand-translated by Cecilia. In production the district's translation office
// owns this: each supported language gets one canonical, legal/tone-reviewed
// version that the admin picks, not edits freely. No runtime translation API.
// See the "Not doing" note in the spec for the full plan.
const MESSAGE_TEMPLATE_ES =
  "¡Hola! Soy la Sra. Reese, de Los Peñasquitos. Estamos juntando familias para caminar a la escuela en las mañanas como parte de nuestro programa walking buddies (al cual mostraron interés durante la matrícula escolar). Tenemos una familia en mente. ¿Les gustaría conocerlos?";

// Stable-per-family avatar tints. First char of `m.family` indexes the palette
// so the Nguyen family's avatar is always the same color across renders.
const AVATAR_PALETTE = [
  { bg: "bg-stone-200", fg: "text-stone-700" },
  { bg: "bg-emerald-100", fg: "text-emerald-900" },
  { bg: "bg-indigo-100", fg: "text-indigo-900" },
  { bg: "bg-amber-100", fg: "text-amber-900" },
  { bg: "bg-rose-100", fg: "text-rose-900" },
  { bg: "bg-sky-100", fg: "text-sky-900" },
  { bg: "bg-violet-100", fg: "text-violet-900" },
];
const avatarFor = (familyName) =>
  AVATAR_PALETTE[familyName.charCodeAt(0) % AVATAR_PALETTE.length];

// Match state machine: suggested → text-sent → helper-confirmed → paired → ended
// Terminal/side states: dismissed (retrievable), blocked (terminal)

function derivedStatus(student, helperStates) {
  if (!qualifiesForNeighbor(student)) return "not-applicable";
  const entries = helperStates[student.id] || {};
  const states = Object.values(entries).map((e) => e.status);
  if (states.includes("paired")) return "paired";
  if (states.includes("helper-confirmed")) return "ready-to-call";
  if (states.includes("text-sent")) return "awaiting-reply";
  if (states.includes("suggested")) return "suggested";
  return "unmatched";
}

// Latest column: pick the helper whose state is furthest along and render the
// message from it. Falls back to student.latest for paired narrative events
// (e.g. "attendance is up 3%") that the state machine doesn't capture.
const LATEST_PRIORITY = {
  ended: 5,
  paired: 4,
  "helper-confirmed": 3,
  "text-sent": 2,
};

function derivedLatest(student, helperStates) {
  const entries = helperStates[student.id] || {};
  const matches = MATCHES_BY_STUDENT[student.id] || [];

  let best = null;
  for (const match of matches) {
    const state = entries[match.key];
    const p = LATEST_PRIORITY[state?.status] || 0;
    if (p && (!best || p > best.p)) best = { match, state, p };
  }
  if (!best) return student.latest ?? null;

  const helperShort = best.match.family.replace(/ family$/, "");
  const { status, sentAt, reply, note } = best.state;

  if (status === "text-sent")
    return {
      helper: helperShort,
      event: "Text sent, no reply yet",
      ago: sentAt || "just now",
    };
  if (status === "helper-confirmed")
    return {
      helper: helperShort,
      event: reply ? `Replied: "${reply}"` : "Helper confirmed",
      ago: sentAt || "just now",
    };
  if (status === "paired")
    return {
      helper: helperShort,
      event: student.latest?.event ?? "Matched",
      ago: student.latest?.ago ?? sentAt ?? "just now",
    };
  if (status === "ended")
    return {
      helper: helperShort,
      event: note || "Match ended",
      ago: "just now",
    };
  return student.latest ?? null;
}

function Sidebar() {
  const navItems = [
    { label: "Students", icon: Users },
    { label: "Interventions", icon: ClipboardList },
    { label: "Attendance", icon: Calendar, active: true, expanded: true },
    { label: "Math", icon: BookOpen },
  ];

  const subItems = [
    "Daily",
    "Conversations",
    "Trends",
    "Contacts",
    "Neighbor",
    "Settings",
  ];

  return (
    <aside className="w-56 border-r border-stone-200 bg-stone-50/50 flex-shrink-0">
      <div className="p-4 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-teal-600 flex items-center justify-center text-white text-xs font-medium">
            N
          </div>
          <div className="text-sm font-medium text-stone-900">
            District attendance
          </div>
        </div>
      </div>
      <nav className="p-2 text-sm">
        {navItems.map((item) => (
          <div key={item.label}>
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer ${
                item.active
                  ? "bg-stone-200/60 text-stone-900 font-medium"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <item.icon size={14} strokeWidth={1.75} />
              {item.label}
            </div>
            {item.expanded && (
              <div className="ml-6 mt-1 mb-2">
                {subItems.map((s) => (
                  <div
                    key={s}
                    className={`px-3 py-1.5 rounded-md cursor-pointer text-xs ${
                      s === "Neighbor"
                        ? "bg-blue-50 text-blue-900 font-medium"
                        : "text-stone-500 hover:bg-stone-100"
                    }`}
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function StatusPill({ status, matchCount }) {
  if (status === "not-applicable")
    return (
      <span className="text-xs px-2 py-0.5 rounded-md bg-stone-100 text-stone-500 italic">
        not a walker
      </span>
    );
  if (status === "paired")
    return (
      <span className="text-xs px-2 py-0.5 rounded-md bg-green-50 text-green-900">
        matched
      </span>
    );
  if (status === "ready-to-call")
    return (
      <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 font-medium">
        call the family
      </span>
    );
  if (status === "awaiting-reply")
    return (
      <span className="text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-900">
        awaiting match
      </span>
    );
  if (status === "suggested" || matchCount > 0)
    return (
      <span className="text-xs text-stone-700">{matchCount} nearby</span>
    );
  return <span className="text-xs text-stone-400">no matches</span>;
}

// Pipeline order: nearby → awaiting match → call the family → matched.
// Keys are the internal derivedStatus values; the user-facing labels live
// in StatusPill.
const STATUS_SORT_ORDER = {
  suggested: 0, // "X nearby"
  unmatched: 0, // same tier (no matches but still early in pipeline)
  "awaiting-reply": 1, // "awaiting match"
  "ready-to-call": 2, // "call the family"
  paired: 3, // "matched"
  "not-applicable": 4, // non-walker
};

function SortHeader({ col, sortBy, sortDir, onClick, children }) {
  const active = sortBy === col;
  return (
    <th
      onClick={() => onClick(col)}
      className="text-left font-normal py-2 pr-4 cursor-pointer select-none hover:text-stone-700"
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <span
          className={`text-[9px] leading-none ${
            active ? "text-stone-700" : "text-stone-300"
          }`}
        >
          {active ? (sortDir === "asc" ? "▲" : "▼") : "▲▼"}
        </span>
      </span>
    </th>
  );
}

function TableView({ onSelectStudent, helperStates }) {
  const [activeMetric, setActiveMetric] = useState("late-p1");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterMode, setFilterMode] = useState("walker");
  const [search, setSearch] = useState("");
  // Default sort: pipeline order via STATUS_SORT_ORDER. Puts "X nearby" at
  // the top and "not a walker" at the bottom so the VP sees unmatched walkers
  // first, which is where her work lives.
  const [sortBy, setSortBy] = useState("status");
  const [sortDir, setSortDir] = useState("asc");

  const toggleSort = (col) => {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  // Per-student derived maps. Computing these once per helperStates change is
  // a lot cheaper than calling derivedStatus ~6×/student while filtering,
  // sorting, counting metric cards, and rendering rows.
  const statusById = useMemo(() => {
    const map = {};
    for (const s of STUDENTS) map[s.id] = derivedStatus(s, helperStates);
    return map;
  }, [helperStates]);

  const latestById = useMemo(() => {
    const map = {};
    for (const s of STUDENTS) map[s.id] = derivedLatest(s, helperStates);
    return map;
  }, [helperStates]);

  const matchCountById = useMemo(() => {
    const map = {};
    for (const s of STUDENTS) {
      const entries = helperStates[s.id] || {};
      map[s.id] = (MATCHES_BY_STUDENT[s.id] || []).reduce((n, m) => {
        const st = entries[m.key]?.status;
        return st === "blocked" || st === "dismissed" ? n : n + 1;
      }, 0);
    }
    return map;
  }, [helperStates]);

  const visibleStudents = useMemo(() => {
    const matchesMetric = (s) => {
      // Metric cards describe walker-workflow states. When the VP has
      // explicitly filtered to a non-walker mode (e.g. "Car"), skip the
      // metric filter so the selected mode's students actually appear.
      if (filterMode !== "walker") return true;
      if (activeMetric === "all") return true;
      if (activeMetric === "late-p1") return isWalkingBuddyCandidate(s.id);
      if (activeMetric === "awaiting") return statusById[s.id] === "awaiting-reply";
      if (activeMetric === "ready") return statusById[s.id] === "ready-to-call";
      if (activeMetric === "lift") return statusById[s.id] === "paired";
      return true;
    };
    const filtered = STUDENTS.filter((s) => {
      if (!matchesMetric(s)) return false;
      if (filterGrade !== "all" && String(s.grade) !== filterGrade) return false;
      if (filterMode !== "all" && s.mode !== filterMode) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
    if (!sortBy) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    const getVal = (s) => {
      if (sortBy === "status") return STATUS_SORT_ORDER[statusById[s.id]] ?? 99;
      if (sortBy === "attendance") return s.attendance;
      if (sortBy === "name") {
        // Sort by last name, not first name. Matches how school rosters read.
        const parts = s.name.trim().split(/\s+/);
        return parts[parts.length - 1].toLowerCase();
      }
      return String(s[sortBy] ?? "").toLowerCase();
    };
    return [...filtered].sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [statusById, activeMetric, filterMode, filterGrade, search, sortBy, sortDir]);

  const toggleMetric = (key) =>
    setActiveMetric((prev) => (prev === key ? "all" : key));

  const metricCards = useMemo(() => {
    let lateP1 = 0;
    let awaiting = 0;
    let ready = 0;
    for (const s of STUDENTS) {
      if (isWalkingBuddyCandidate(s.id)) lateP1 += 1;
      const st = statusById[s.id];
      if (st === "awaiting-reply") awaiting += 1;
      if (st === "ready-to-call") ready += 1;
    }
    return [
      { key: "late-p1", n: lateP1, l: "Late to period 1 only" },
      { key: "awaiting", n: awaiting, l: "Awaiting match" },
      { key: "ready", n: ready, l: "Call the family" },
      { key: "lift", n: "+7%", l: "P1 attendance lift" },
    ];
  }, [statusById]);

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="px-8 pt-6 pb-4 border-b border-stone-200">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs text-stone-500 mb-1">
              Attendance / Neighbor
            </div>
            <h1 className="text-xl font-medium text-stone-900">
              Neighbor
            </h1>
          </div>
          <span className="text-xs px-3 py-1 bg-amber-50 text-amber-900 rounded-md">
            Pilot · Los Peñasquitos Elementary
          </span>
        </div>
        <div className="max-w-2xl mt-4 text-sm text-stone-600 leading-relaxed">
          <p className="mb-3">
            Students with this attendance pattern:
          </p>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-0.5">
              {["tardy", "present", "present", "present", "present", "present"].map(
                (status, i) => {
                  let bg;
                  if (status === "present") bg = "#97C459";
                  else if (status === "tardy") bg = "#EF9F27";
                  else bg = "#E24B4A";
                  return (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-sm flex items-center justify-center text-[10px] text-white font-medium"
                      style={{ background: bg }}
                    >
                      {i + 1}
                    </div>
                  );
                }
              )}
            </div>
            <span className="text-xs text-stone-500">
              late to period 1, present the rest of the day
            </span>
          </div>
          <p>
            usually have a getting-to-school issue. Exactly what a
            neighborhood walking buddy can solve.
          </p>
        </div>
      </div>

      <div className="px-8 py-4 grid grid-cols-4 gap-3 border-b border-stone-200">
        {metricCards.map((m) => {
          const isActive = activeMetric === m.key;
          return (
            <button
              key={m.key}
              onClick={() => toggleMetric(m.key)}
              className={`text-left rounded-md px-4 py-3 transition-colors border ${
                isActive
                  ? "bg-blue-50 border-blue-300 ring-1 ring-blue-300"
                  : "bg-stone-50 border-transparent hover:bg-stone-100"
              }`}
            >
              <div
                className={`text-xs mb-1 ${
                  isActive ? "text-blue-900" : "text-stone-500"
                }`}
              >
                {m.l}
              </div>
              <div
                className={`text-xl font-medium ${
                  isActive ? "text-blue-900" : "text-stone-900"
                }`}
              >
                {m.n}
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-8 py-3 flex items-center gap-3 border-b border-stone-200 bg-stone-50/30">
        <div className="flex items-center gap-2 text-stone-500">
          <Filter size={14} strokeWidth={1.75} />
          <span className="text-xs">Filter</span>
        </div>
        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value)}
          className="text-sm border border-stone-200 rounded-md px-2 py-1.5 bg-white"
        >
          <option value="walker">Walkers</option>
          <option value="car">Car</option>
          <option value="bus">Bus</option>
          <option value="all">All modes</option>
        </select>
        <select
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
          className="text-sm border border-stone-200 rounded-md px-2 py-1.5 bg-white"
        >
          <option value="all">All grades</option>
          <option value="K">Kindergarten</option>
          <option value="1">Grade 1</option>
          <option value="2">Grade 2</option>
          <option value="3">Grade 3</option>
          <option value="4">Grade 4</option>
          <option value="5">Grade 5</option>
        </select>
        <div className="flex-1 relative max-w-xs ml-auto">
          <Search
            size={14}
            strokeWidth={1.75}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student"
            className="w-full text-sm border border-stone-200 rounded-md pl-8 pr-3 py-1.5 bg-white"
          />
        </div>
      </div>

      <div className="px-8 py-4">
        <div className="text-xs text-stone-500 mb-3">
          {visibleStudents.length} students
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-stone-500 border-b border-stone-200">
              <SortHeader col="name" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort}>Student</SortHeader>
              <SortHeader col="id" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort}>ID</SortHeader>
              <SortHeader col="mode" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort}>Mode</SortHeader>
              <SortHeader col="attendance" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort}>YTD</SortHeader>
              <SortHeader col="status" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort}>Status</SortHeader>
              <th className="text-left font-normal py-2 pr-4">Latest</th>
              <th className="text-left font-normal py-2"></th>
            </tr>
          </thead>
          <tbody>
            {visibleStudents.map((s) => {
              const badge = attendanceBadge(s.attendance);
              const latest = latestById[s.id];

              return (
                <tr
                  key={s.id}
                  onClick={() => onSelectStudent(s)}
                  className="border-b border-stone-100 hover:bg-stone-50 cursor-pointer"
                >
                  <td className="py-3 pr-4">
                    <div className="font-medium text-stone-900">{s.name}</div>
                    <div className="text-xs text-stone-500">
                      Grade {s.grade}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-stone-500 font-mono text-xs">
                    {s.id}
                  </td>
                  <td className="py-3 pr-4 text-stone-600 text-xs capitalize">
                    {s.mode}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-md"
                      style={{ background: badge.bg, color: badge.fg }}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <StatusPill
                      status={statusById[s.id]}
                      matchCount={matchCountById[s.id]}
                    />
                  </td>
                  <td className="py-3 pr-4 text-xs">
                    {latest ? (
                      <>
                        <div className="text-stone-700">
                          {latest.helper && (
                            <>
                              <span className="font-medium">
                                {latest.helper}
                              </span>
                              {" · "}
                            </>
                          )}
                          {latest.event}
                        </div>
                        <div className="text-stone-500 mt-0.5">
                          {latest.ago}
                        </div>
                      </>
                    ) : (
                      <span className="text-stone-300">—</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <ArrowRight
                      size={14}
                      strokeWidth={1.75}
                      className="text-stone-400"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NoteDialog({
  title,
  body,
  actionLabel,
  onSubmit,
  onClose,
  tagOptions,
}) {
  const [note, setNote] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);

  const toggleTag = (tag) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  return (
    <div className="fixed inset-0 bg-stone-900/40 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg max-w-md w-full shadow-lg border border-stone-200">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <h3 className="text-sm font-medium text-stone-900">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-stone-600 leading-relaxed">{body}</p>
          {tagOptions && tagOptions.length > 0 && (
            <div>
              <div className="text-xs text-stone-600 mb-2">
                Reason (select any that apply)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tagOptions.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        isSelected
                          ? "bg-stone-800 text-white border-stone-800"
                          : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Optional note (not shared with families)"
            className="w-full text-sm border border-stone-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:border-stone-400"
          />
        </div>
        <div className="px-5 py-3 border-t border-stone-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-md border border-stone-200 text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(note, selectedTags)}
            className="text-xs px-3 py-1.5 rounded-md font-medium text-white bg-stone-800 hover:bg-stone-900"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Quick-select reasons on dismiss. "Family not a good fit" is intentionally
// absent — too easy to become a vehicle for bias.
const DISMISS_TAGS = [
  "Crosses a main road",
  "Different schedules",
  "Too far apart in grade",
  "Other",
];

// Full-width detail view shown once an outreach leaves the suggested state.
// The prototype scopes down to the map-based candidate-selection workflow, so
// downstream surfaces (conversation thread, call script, pair tracking) are
// stubbed with a "Not built for this demo" note rather than built out.
const NOT_BUILT_COPY = {
  "text-sent":
    "A production page could show the full text thread with the helper family, a send-follow-up action, and a one-click fallback to try a different family if the reply doesn't come.",
  "helper-confirmed":
    "A production page would hand the VP a call script for the family in need and a place to log the call, with a single button to mark the pair once both sides say yes.",
  paired:
    "A production page would track the chronically absent child's attendance trend over the coming weeks, along with the helper family's attendance as a guardrail. It would also expose actions to end the pairing, pair with another family, propose an alternative, or mark the case as successfully closed.",
};

function ActiveOutreach({ kidFirstName, helper, state }) {
  const status = state?.status;
  const sentAt = state?.sentAt || "just now";

  const banner = {
    "text-sent": {
      dot: "bg-amber-500",
      text: "text-amber-900",
      bg: "bg-amber-50 border-amber-200",
      title: `Awaiting ${helper.family}`,
      sub: `We texted them ${sentAt}. No reply yet.`,
    },
    "helper-confirmed": {
      dot: "bg-blue-500",
      text: "text-blue-900",
      bg: "bg-blue-50 border-blue-200",
      title: `${helper.family} confirmed, time to call the family`,
      sub: `Call ${kidFirstName}'s parent. Don't name the family yet, that comes after they say yes.`,
    },
    paired: {
      dot: "bg-green-500",
      text: "text-green-900",
      bg: "bg-green-50 border-green-200",
      title: `Matched with ${helper.family}`,
      sub: `Introduction done ${sentAt}. Families take it from here.`,
    },
    ended: {
      dot: "bg-stone-400",
      text: "text-stone-800",
      bg: "bg-stone-50 border-stone-200",
      title: `Match ended`,
      sub: state?.note || "No reason recorded.",
    },
  }[status];

  const notBuiltCopy = NOT_BUILT_COPY[status];

  return (
    <div className="max-w-3xl space-y-4">
      <div className={`border rounded-lg px-4 py-3 ${banner.bg}`}>
        <div className={`flex items-center gap-2 text-sm font-medium ${banner.text}`}>
          <span className={`w-2 h-2 rounded-full ${banner.dot}`} />
          {banner.title}
        </div>
        <div className={`text-xs mt-1 ml-4 ${banner.text} opacity-90`}>
          {banner.sub}
        </div>
      </div>

      {notBuiltCopy && (
        <div className="border border-dashed border-stone-300 rounded-lg px-4 py-3 bg-stone-50/60">
          <div className="text-xs font-medium uppercase tracking-wide text-stone-500 mb-1">
            Not built for this demo
          </div>
          <p className="text-sm text-stone-600 leading-relaxed">
            {notBuiltCopy}
          </p>
        </div>
      )}
    </div>
  );
}

function MapView({ student, onBack, helperStates, setHelperState }) {
  const matches = MATCHES_BY_STUDENT[student.id] || [];
  const studentStates = helperStates[student.id] || {};

  const [selected, setSelected] = useState(null);
  const [composerText, setComposerText] = useState(MESSAGE_TEMPLATE);
  const [showDismissed, setShowDismissed] = useState(false);
  const [dialog, setDialog] = useState(null); // { matchKey }

  // Language pills hide once the VP customizes the message. FERPA: we can't
  // safely translate edited text with a runtime service (student context would
  // leave district control), and we haven't pre-translated the edits. The
  // templates are the only content we own in both languages.
  const isCanonicalTemplate =
    composerText === MESSAGE_TEMPLATE || composerText === MESSAGE_TEMPLATE_ES;

  // An outreach is "active" once it leaves the suggested state. While one is
  // in flight, the candidate cards for other helpers get hidden — the VP is
  // committed to the current family until she explicitly backs out.
  // Candidates render alphabetically by family name: the system can't rank
  // helpers by reliability/proximity/etc. without introducing bias, and
  // declaration order would read as an implicit recommendation. Alphabetical
  // is a neutral, predictable shuffle.
  const { activeHelper, candidateHelpers } = useMemo(() => {
    const ACTIVE = new Set(["text-sent", "helper-confirmed", "paired", "ended"]);
    let activeHelper = null;
    const candidateHelpers = [];
    for (const m of matches) {
      const st = studentStates[m.key]?.status;
      if (ACTIVE.has(st)) {
        if (!activeHelper) activeHelper = m;
        continue;
      }
      if (st === "blocked") continue;
      if (st === "dismissed" && !showDismissed) continue;
      candidateHelpers.push(m);
    }
    candidateHelpers.sort((a, b) => a.family.localeCompare(b.family));
    return { activeHelper, candidateHelpers };
  }, [matches, studentStates, showDismissed]);

  const activeState = activeHelper ? studentStates[activeHelper.key] : null;

  const hiddenDismissed = matches.filter(
    (m) => studentStates[m.key]?.status === "dismissed"
  ).length;

  // If the selected candidate drops off the list (dismissed or blocked), or
  // an outreach starts up, clear the composer selection.
  useEffect(() => {
    if (activeHelper) {
      setSelected(null);
      return;
    }
    if (selected && !candidateHelpers.some((m) => m.key === selected)) {
      setSelected(null);
    }
  }, [activeHelper, candidateHelpers, selected]);

  // Reset the composer to the template whenever the VP switches which
  // candidate they're composing to.
  useEffect(() => {
    setComposerText(MESSAGE_TEMPLATE);
  }, [selected]);

  const selectedCandidate = candidateHelpers.find((m) => m.key === selected);

  const sendText = () => {
    if (!selected) return;
    setHelperState(student.id, selected, {
      status: "text-sent",
      message: composerText,
      sentAt: "just now",
    });
    setComposerText(MESSAGE_TEMPLATE);
  };

  const submitDialog = (note, tags = []) => {
    if (!dialog) return;
    setHelperState(student.id, dialog.matchKey, {
      status: "dismissed",
      note: note || null,
      tags: tags.length > 0 ? tags : null,
    });
    setDialog(null);
  };

  const kidFirstName = student.name.split(" ")[0];

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="px-8 pt-5 pb-4 border-b border-stone-200">
        <div className="flex items-center gap-2 text-xs text-stone-500 mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 hover:text-stone-900"
          >
            <ChevronLeft size={14} strokeWidth={1.75} />
            Neighbor
          </button>
          <span>/</span>
          <span className="text-stone-900">{student.name}</span>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-orange-50 text-orange-900 flex items-center justify-center font-medium text-sm">
              {student.name
                .split(" ")
                .map((p) => p[0])
                .join("")}
            </div>
            <div>
              <div className="text-lg font-medium text-stone-900">
                {student.name}{" "}
                <span className="text-stone-400 font-normal text-sm">
                  · {student.id}
                </span>
              </div>
              <div className="text-sm text-stone-600">
                Grade {student.grade} · {student.mode} · pattern:{" "}
                {student.pattern.toLowerCase()}
              </div>
              {student.address && (
                <div className="text-xs text-stone-500 mt-0.5">
                  {student.address}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {hiddenDismissed > 0 && (
              <button
                onClick={() => setShowDismissed(!showDismissed)}
                className="text-xs px-3 py-1.5 border border-stone-200 rounded-md hover:bg-stone-50 flex items-center gap-1.5 text-stone-700"
              >
                {showDismissed ? (
                  <EyeOff size={12} strokeWidth={1.75} />
                ) : (
                  <Eye size={12} strokeWidth={1.75} />
                )}
                {showDismissed ? "Hide dismissed" : `Show dismissed (${hiddenDismissed})`}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {!qualifiesForNeighbor(student) && (
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-5 text-sm text-stone-700 leading-relaxed max-w-2xl">
            <div className="font-medium text-stone-900 mb-1">
              {kidFirstName} isn't a walker.
            </div>
            <p className="text-stone-600">
              Neighbor is walker-only in V1. Mode on file:{" "}
              <span className="capitalize">{student.mode}</span>. Carpool
              matching would introduce insurance and liability we aren't set
              up for yet.
            </p>
          </div>
        )}

        {qualifiesForNeighbor(student) && matches.length === 0 && (
          <div className="bg-stone-50 rounded-lg p-5 text-sm text-stone-600 max-w-2xl">
            No opted-in families are currently matched to this student.
          </div>
        )}

        {qualifiesForNeighbor(student) && activeHelper && (
          <ActiveOutreach
            kidFirstName={kidFirstName}
            helper={activeHelper}
            state={activeState}
          />
        )}

        {qualifiesForNeighbor(student) && !activeHelper && matches.length > 0 && (
          <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-stone-900">
                  Neighborhood · walking route to Los Peñasquitos elementary
                </h3>
                <a
                  href={buildMapsRouteUrl(student, selectedCandidate)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-stone-200 text-stone-700 hover:bg-stone-50"
                >
                  Open in Google Maps
                  <ExternalLink size={11} strokeWidth={1.75} />
                </a>
              </div>
              <GoogleMapView
                student={student}
                selectedMatch={selectedCandidate}
              />
            </div>

            <div className="space-y-3">
            <div className="text-xs text-stone-500 font-medium uppercase tracking-wide px-1">
              {candidateHelpers.length} opted-in nearby
            </div>

            {candidateHelpers.map((m) => {
              const isSelected = selected === m.key;
              const state = studentStates[m.key]?.status;
              const isDismissed = state === "dismissed";
              const avatar = avatarFor(m.family);
              return (
                <div
                  key={m.key}
                  className={`group bg-white border rounded-lg overflow-hidden transition-colors ${
                    isSelected
                      ? "border-stone-200 border-l-4 border-l-blue-500"
                      : "border-stone-200 hover:border-stone-300"
                  } ${isDismissed ? "opacity-75" : ""}`}
                >
                  <div
                    onClick={() => setSelected(isSelected ? null : m.key)}
                    className="p-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full ${avatar.bg} ${avatar.fg} flex items-center justify-center text-sm font-medium flex-shrink-0`}
                      >
                        {m.family.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-stone-900">
                          {m.family}
                        </div>
                        <div className="text-xs text-stone-600 mt-0.5">
                          {m.child} · grade {m.grade} · {m.mode} ·{" "}
                          <span className="text-stone-500">
                            {m.attendance}% YTD
                          </span>
                        </div>
                      </div>
                      {!isSelected && !isDismissed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDialog({ matchKey: m.key });
                          }}
                          className="flex-shrink-0 text-xs px-3 py-1 rounded-md border border-transparent text-stone-400 transition-colors group-hover:border-stone-300 group-hover:text-stone-700 group-hover:bg-white"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>

                    {isSelected && !isDismissed && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="mt-4 space-y-3"
                      >
                        <div className="text-[10px] uppercase tracking-wider font-medium text-stone-500">
                          Consent text
                        </div>
                        <textarea
                          value={composerText}
                          onChange={(e) => setComposerText(e.target.value)}
                          rows={5}
                          className="w-full text-xs text-stone-700 leading-relaxed border border-stone-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:border-stone-400"
                        />
                        {isCanonicalTemplate && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setComposerText(MESSAGE_TEMPLATE)}
                              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-100 hover:bg-blue-100"
                            >
                              <Globe size={11} strokeWidth={1.75} />
                              English
                            </button>
                            <button
                              onClick={() => setComposerText(MESSAGE_TEMPLATE_ES)}
                              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-100 hover:bg-blue-100"
                            >
                              <Globe size={11} strokeWidth={1.75} />
                              Spanish
                            </button>
                          </div>
                        )}
                        <button
                          onClick={sendText}
                          style={{ backgroundColor: "#4338ca" }}
                          className="w-full inline-flex items-center justify-center gap-1.5 text-xs py-2 text-white rounded-md font-medium hover:brightness-110"
                        >
                          Send text
                          <ArrowRight size={12} strokeWidth={2} />
                        </button>
                      </div>
                    )}
                  </div>

                  {isSelected && !isDismissed && (
                    <div className="border-t border-dashed border-stone-200 px-3 py-2 flex items-center justify-between bg-stone-50/40">
                      <span className="text-xs text-stone-500">
                        Not the right fit?
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDialog({ matchKey: m.key });
                        }}
                        className="text-xs px-3 py-1 rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50 bg-white"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {isDismissed && (
                    <div className="border-t border-dashed border-stone-200 px-3 py-2 space-y-1.5 bg-stone-50/40">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-stone-500 italic">
                          Dismissed
                          {studentStates[m.key]?.note
                            ? `: "${studentStates[m.key].note}"`
                            : ""}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setHelperState(student.id, m.key, {
                              status: "suggested",
                              note: null,
                              tags: null,
                            });
                          }}
                          className="text-xs text-stone-700 underline"
                        >
                          Un-dismiss
                        </button>
                      </div>
                      {studentStates[m.key]?.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {studentStates[m.key].tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        )}
      </div>

      {qualifiesForNeighbor(student) && !activeHelper && matches.length > 0 && (
        <div className="px-8 pb-8">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-stone-600">
            <span className="text-[11px] font-medium text-stone-900 uppercase tracking-wide">
              A few things we promise:
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Heart size={12} strokeWidth={1.75} className="text-stone-500" />
              You pick every match.
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock size={12} strokeWidth={1.75} className="text-stone-500" />
              Helpers never learn who the student is until both sides say yes.
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={12} strokeWidth={1.75} className="text-stone-500" />
              Attendance is the only thing we track.
            </span>
          </div>
        </div>
      )}

      {dialog && (
        <NoteDialog
          title="Dismiss this match"
          body="Dismissing hides this match from the default view. You can show dismissed matches again if circumstances change."
          actionLabel="Dismiss"
          tagOptions={DISMISS_TAGS}
          onSubmit={submitDialog}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

// Seed states so the table pills match the spec'd scenarios from the start.
// Keys must match MATCHES_BY_STUDENT entry keys in data.js.
const initialHelperStates = {
  "354201": {
    "nguyen-354201": { status: "suggested" },
    "ramirez-354201": { status: "suggested" },
    "okafor-354201": { status: "suggested" },
  },
  "354139": {
    "chen-354139": { status: "suggested" },
    "brennan-354139": { status: "suggested" },
  },
  "354141": {
    "patel-354141": { status: "suggested" },
    "kaur-354141": { status: "suggested" },
  },
  "354084": {
    "okonkwo-354084": {
      status: "text-sent",
      message: MESSAGE_TEMPLATE,
      sentAt: "5h ago",
    },
    "wallace-354084": { status: "suggested" },
  },
  "354195": {
    "lopez-354195": {
      status: "paired",
      message: MESSAGE_TEMPLATE,
      sentAt: "1 wk",
    },
    "russo-354195": { status: "suggested" },
  },
  "354081": {
    "delgado-354081": {
      status: "paired",
      message: MESSAGE_TEMPLATE,
      sentAt: "3 wk",
    },
    "holloway-354081": { status: "suggested" },
  },
  "354095": {
    "takahashi-354095": {
      status: "helper-confirmed",
      message: MESSAGE_TEMPLATE,
      sentAt: "20m ago",
      reply: "Happy to help.",
    },
    "abebe-354095": { status: "suggested" },
  },
};

export default function App() {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [helperStates, setHelperStates] = useState(initialHelperStates);

  const setHelperState = (studentId, matchKey, update) => {
    setHelperStates((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [matchKey]: { ...(prev[studentId]?.[matchKey] || {}), ...update },
      },
    }));
  };

  return (
    <div className="flex h-screen bg-white text-stone-900 font-sans">
      <Sidebar />
      {selectedStudent ? (
        <MapView
          student={selectedStudent}
          onBack={() => setSelectedStudent(null)}
          helperStates={helperStates}
          setHelperState={setHelperState}
        />
      ) : (
        <TableView
          onSelectStudent={setSelectedStudent}
          helperStates={helperStates}
        />
      )}
    </div>
  );
}
