// Synthetic data for Neighbor prototype. Student and family names are
// fictional. Addresses on the 7 walker students are real Rancho Peñasquitos
// (San Diego 92129) streets verified on Google Maps as being within ≤0.5 mi
// walking of Los Peñasquitos Elementary. Helper-family pins are coords on
// those same streets (house numbers synthetic). The product ranks helpers
// by nearest-neighbor proximity at query time; the prototype hardcodes a
// handful of already-nearby opted-in families per student.

export const LOS_PENASQUITOS_ELEMENTARY = {
  lat: 32.9697,
  lng: -117.0972,
  name: "Los Peñasquitos elementary",
  // Address string used for Maps Embed + deep link. Google's geocoder snaps
  // bare lat/lng to nearby service-area businesses (HVAC, etc.), so we send
  // the street address instead and let the geocoder resolve to the school.
  address: "14125 Cuca St, San Diego, CA 92129",
};

export const STUDENTS = [
  {
    id: "354201",
    name: "Marcus Johnson",
    grade: 3,
    mode: "walker",
    attendance: 76,
    pattern: "Late arrivals, Mondays",
    latest: null,
    address: "10930 Tyler Way",
    home: { lat: 32.9711, lng: -117.0934 },
  },
  {
    id: "354139",
    name: "Eliana Rivera",
    grade: 2,
    mode: "walker",
    attendance: 78,
    pattern: "Fridays, morning illness",
    latest: null,
    address: "10862 Olivia Way",
    home: { lat: 32.9695, lng: -117.0946 },
  },
  {
    id: "354141",
    name: "Noah Bennett",
    grade: "K",
    mode: "walker",
    attendance: 74,
    pattern: "Parent shift conflict",
    latest: null,
    address: "14360 Janal Way",
    home: { lat: 32.9758, lng: -117.0957 },
  },
  {
    id: "354179",
    name: "Oscar Park",
    grade: 4,
    mode: "car",
    attendance: 82,
    pattern: "Intermittent",
    latest: null,
    address: "8525 Mira Mesa Blvd",
    home: { lat: 32.93, lng: -117.08 },
  },
  {
    id: "354084",
    name: "Adeline Fischer",
    grade: 1,
    mode: "walker",
    attendance: 85,
    pattern: "Tardy clusters",
    latest: {
      helper: "Okonkwo",
      event: "Text sent, no reply yet",
      ago: "5h ago",
    },
    address: "10752 Cuca St",
    home: { lat: 32.9706, lng: -117.0963 },
  },
  {
    id: "354195",
    name: "Lilliana Kowalski",
    grade: 3,
    mode: "walker",
    attendance: 81,
    pattern: "Extended absences, recovering",
    latest: {
      helper: "Lopez",
      event: "Lilliana's attendance is up 3%",
      ago: "1 wk",
    },
    address: "10896 Via Lombardia",
    home: { lat: 32.9768, lng: -117.0944 },
  },
  {
    id: "354095",
    name: "Christina Haddad",
    grade: 2,
    mode: "walker",
    attendance: 79,
    pattern: "Mondays, Fridays",
    latest: {
      helper: "Takahashi",
      event: "Replied: \"Happy to help.\"",
      ago: "20m ago",
    },
    address: "14345 Cuca St",
    home: { lat: 32.9745, lng: -117.0956 },
  },
  {
    id: "354081",
    name: "Rebecca Osei",
    grade: 5,
    mode: "walker",
    attendance: 88,
    pattern: "none",
    latest: {
      helper: "Delgado",
      event: "Rebecca's attendance is up 11%",
      ago: "3 wk",
    },
    address: "10753 Via Las Posadas",
    home: { lat: 32.9712, lng: -117.0957 },
  },
];

// Period status: 'present' (green), 'tardy' (yellow), 'absent' (red).
// Walking-buddy target: tardy or absent in P1, present P2-6.
export const PERIOD_PATTERNS = {
  "354201": ["tardy", "present", "present", "present", "present", "present"],
  "354139": ["tardy", "present", "present", "present", "present", "present"],
  "354141": ["absent", "absent", "absent", "absent", "absent", "absent"],
  "354179": ["tardy", "tardy", "present", "present", "present", "present"],
  "354084": ["tardy", "present", "present", "present", "present", "present"],
  "354195": ["tardy", "present", "present", "present", "present", "present"],
  "354081": ["tardy", "present", "present", "present", "present", "present"],
  "354095": ["tardy", "present", "present", "present", "present", "present"],
};

// Opted-in helper families near each walker student. The card only shows
// family name, child, grade, mode, and attendance — the VP judges route and
// fit from the map. Non-walkers (Oscar) have no entry: they don't qualify
// for the walker-only V1 program.
export const MATCHES_BY_STUDENT = {
  "354201": [
    {
      key: "nguyen-354201",
      family: "Nguyen family",
      child: "Anh",
      grade: 3,
      mode: "walker",
      attendance: 96,
      coords: { lat: 32.9692, lng: -117.0954 },
    },
    {
      key: "ramirez-354201",
      family: "Ramirez family",
      child: "Sofia",
      grade: 3,
      mode: "walker",
      attendance: 98,
      coords: { lat: 32.9706, lng: -117.0958 },
    },
    {
      key: "okafor-354201",
      family: "Okafor family",
      child: "Amara",
      grade: 3,
      mode: "walker",
      attendance: 94,
      coords: { lat: 32.967, lng: -117.097 },
    },
  ],
  "354139": [
    {
      key: "chen-354139",
      family: "Chen family",
      child: "Leo",
      grade: 2,
      mode: "walker",
      attendance: 95,
      coords: { lat: 32.9688, lng: -117.0940 },
    },
    {
      key: "brennan-354139",
      family: "Brennan family",
      child: "Maeve",
      grade: 2,
      mode: "walker",
      attendance: 93,
      coords: { lat: 32.9702, lng: -117.0938 },
    },
  ],
  "354141": [
    {
      key: "patel-354141",
      family: "Patel family",
      child: "Arjun",
      grade: 2,
      mode: "walker",
      attendance: 97,
      coords: { lat: 32.9765, lng: -117.0958 },
    },
    {
      key: "kaur-354141",
      family: "Kaur family",
      child: "Simran",
      grade: 1,
      mode: "walker",
      attendance: 92,
      coords: { lat: 32.9755, lng: -117.095 },
    },
  ],
  "354084": [
    {
      key: "okonkwo-354084",
      family: "Okonkwo family",
      child: "Chidi",
      grade: 2,
      mode: "walker",
      attendance: 94,
      coords: { lat: 32.9702, lng: -117.0965 },
    },
    {
      key: "wallace-354084",
      family: "Wallace family",
      child: "Iris",
      grade: 1,
      mode: "walker",
      attendance: 96,
      coords: { lat: 32.9708, lng: -117.0955 },
    },
  ],
  "354195": [
    {
      key: "lopez-354195",
      family: "Lopez family",
      child: "Diego",
      grade: 3,
      mode: "walker",
      attendance: 93,
      coords: { lat: 32.977, lng: -117.094 },
    },
    {
      key: "russo-354195",
      family: "Russo family",
      child: "Marco",
      grade: 3,
      mode: "walker",
      attendance: 95,
      coords: { lat: 32.9775, lng: -117.0948 },
    },
  ],
  "354081": [
    {
      key: "delgado-354081",
      family: "Delgado family",
      child: "Elena",
      grade: 5,
      mode: "walker",
      attendance: 97,
      coords: { lat: 32.972, lng: -117.0958 },
    },
    {
      key: "holloway-354081",
      family: "Holloway family",
      child: "Zoe",
      grade: 5,
      mode: "walker",
      attendance: 91,
      coords: { lat: 32.9668, lng: -117.0968 },
    },
  ],
  "354095": [
    {
      key: "takahashi-354095",
      family: "Takahashi family",
      child: "Yuki",
      grade: 2,
      mode: "walker",
      attendance: 95,
      coords: { lat: 32.9742, lng: -117.096 },
    },
    {
      key: "abebe-354095",
      family: "Abebe family",
      child: "Hana",
      grade: 2,
      mode: "walker",
      attendance: 98,
      coords: { lat: 32.975, lng: -117.0948 },
    },
  ],
};

export const isWalkingBuddyCandidate = (studentId) => {
  const p = PERIOD_PATTERNS[studentId];
  if (!p) return false;
  const p1Missing = p[0] === "tardy" || p[0] === "absent";
  const restPresent = p.slice(1).every((s) => s === "present");
  return p1Missing && restPresent;
};

export const qualifiesForNeighbor = (student) => student.mode === "walker";

export const attendanceBadge = (pct) => {
  if (pct >= 90) return { bg: "#EAF3DE", fg: "#3B6D11", label: `${pct}%` };
  if (pct >= 80) return { bg: "#FAEEDA", fg: "#854F0B", label: `${pct}%` };
  return { bg: "#FCEBEB", fg: "#A32D2D", label: `${pct}%` };
};
