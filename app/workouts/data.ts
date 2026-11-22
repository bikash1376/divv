// Every set is 10 reps unless an exercise says otherwise.
export const REPS = 10;

// Cloudinary public id (with version) per exercise; originals are in the local videos-cloudinary folder.
export const videos = {
  "incline-db-press": "v1795344609/incline-db-press",
  "pec-deck": "v1795344647/pec-deck",
  "high-to-low-cable-fly": "v1795344599/high-to-low-cable-fly",
  "cable-pushdown": "v1795344535/cable-pushdown",
  "overhead-cable-extension": "v1795344637/overhead-cable-extension",
  "cable-wrist-curl": "v1795344541/cable-wrist-curl",
  "assisted-pull-up": "v1795344513/assisted-pull-up",
  "db-row": "v1795344555/db-row",
  "rear-delt-fly": "v1795344660/rear-delt-fly",
  "incline-db-curl": "v1795344604/incline-db-curl",
  "hammer-curl": "v1795344593/hammer-curl",
  "goblet-squat": "v1795344588/goblet-squat",
  "bulgarian-split-squat": "v1795344518/bulgarian-split-squat",
  "db-rdl": "v1795344550/db-rdl",
  "leg-curl": "v1795344632/leg-curl",
  "db-calf-raise": "v1795344546/db-calf-raise",
  "db-shoulder-press": "v1795344560/db-shoulder-press",
  "lateral-raise": "v1795344625/lateral-raise",
  shrug: "v1795344674/shrug",
  "flat-db-press": "v1795344583/flat-db-press",
  "incline-smith-press": "v1795344614/incline-smith-press",
  "cable-fly": "v1795344530/cable-fly",
  "push-up": "v1795344654/push-up",
  "rope-pushdown": "v1795344669/rope-pushdown",
  "overhead-db-extension": "v1795344641/overhead-db-extension",
  "reverse-wrist-curl": "v1795344664/reverse-wrist-curl",
  "farmers-carry": "v1795344571/farmers-carry",
  "lat-pulldown": "v1795344619/lat-pulldown",
  "single-arm-db-row": "v1795344679/single-arm-db-row",
  "face-pull": "v1795344566/face-pull",
  "cable-curl": "v1795344525/cable-curl",
} as const;

/** Cloudinary delivery URL sized for where the clip is shown (grid ≈ 640, lightbox ≈ 1280). */
export const clipUrl = (id: ExerciseId, width: 640 | 1280) =>
  `https://res.cloudinary.com/dz5zwlbvb/video/upload/q_auto,w_${width}/${videos[id]}.mp4`;

export type ExerciseId = keyof typeof videos;

export type Exercise = {
  id: ExerciseId;
  name: string;
  sets: number;
  /** Overrides "× 10" — e.g. "to failure" or "30–40 m". */
  reps?: string;
};

export type Group = { muscle: string; exercises: Exercise[] };

export type Day = { short: string; name: string; title: string; groups: Group[] };

const ex = (id: ExerciseId, name: string, sets = 3, reps?: string): Exercise => ({ id, name, sets, reps });

const legsShoulders: Group[] = [
  {
    muscle: "Legs",
    exercises: [
      ex("goblet-squat", "Goblet squat"),
      ex("bulgarian-split-squat", "Bulgarian split squat", 3, "10 / leg"),
      ex("db-rdl", "Dumbbell Romanian deadlift"),
      ex("leg-curl", "Leg curl"),
      ex("db-calf-raise", "Dumbbell calf raise", 4, "15"),
    ],
  },
  {
    muscle: "Shoulders",
    exercises: [
      ex("db-shoulder-press", "Dumbbell shoulder press"),
      ex("lateral-raise", "Lateral raise", 4),
      ex("shrug", "Shrugs"),
    ],
  },
];

// Index 0 = Sunday, matching Date#getDay.
export const week: Day[] = [
  { short: "Sun", name: "Sunday", title: "Rest", groups: [] },
  {
    short: "Mon",
    name: "Monday",
    title: "Chest · Triceps · Forearms",
    groups: [
      {
        muscle: "Chest",
        exercises: [
          ex("incline-db-press", "Incline dumbbell press"),
          ex("flat-db-press", "Flat dumbbell press"),
          ex("pec-deck", "Pec deck fly"),
          ex("high-to-low-cable-fly", "High-to-low cable fly", 2),
        ],
      },
      {
        muscle: "Triceps",
        exercises: [
          ex("cable-pushdown", "Cable pushdown"),
          ex("overhead-cable-extension", "Overhead cable extension"),
        ],
      },
      {
        muscle: "Forearms",
        exercises: [ex("cable-wrist-curl", "Cable wrist curl"), ex("reverse-wrist-curl", "Reverse wrist curl")],
      },
    ],
  },
  {
    short: "Tue",
    name: "Tuesday",
    title: "Back · Rear delts · Biceps",
    groups: [
      {
        muscle: "Back",
        exercises: [
          ex("assisted-pull-up", "Assisted pull-up"),
          ex("single-arm-db-row", "Single-arm dumbbell row"),
          ex("db-row", "Bent-over dumbbell row"),
        ],
      },
      { muscle: "Rear delts", exercises: [ex("rear-delt-fly", "Rear delt fly (pec deck)")] },
      {
        muscle: "Biceps",
        exercises: [ex("incline-db-curl", "Incline dumbbell curl"), ex("hammer-curl", "Hammer curl")],
      },
    ],
  },
  { short: "Wed", name: "Wednesday", title: "Legs · Shoulders", groups: legsShoulders },
  {
    short: "Thu",
    name: "Thursday",
    title: "Chest · Triceps · Forearms",
    groups: [
      {
        muscle: "Chest",
        exercises: [
          ex("flat-db-press", "Flat dumbbell press"),
          ex("incline-smith-press", "Incline smith press"),
          ex("cable-fly", "Cable fly"),
          ex("push-up", "Push-ups", 2, "to failure"),
        ],
      },
      {
        muscle: "Triceps",
        exercises: [
          ex("rope-pushdown", "Rope pushdown"),
          ex("overhead-db-extension", "Overhead dumbbell extension"),
        ],
      },
      {
        muscle: "Forearms",
        exercises: [
          ex("cable-wrist-curl", "Cable wrist curl"),
          ex("farmers-carry", "Farmer's carry", 3, "30–40 m"),
        ],
      },
    ],
  },
  {
    short: "Fri",
    name: "Friday",
    title: "Back · Rear delts · Biceps",
    groups: [
      {
        muscle: "Back",
        exercises: [
          ex("lat-pulldown", "Lat pulldown"),
          ex("single-arm-db-row", "Single-arm dumbbell row"),
          ex("db-row", "Bent-over dumbbell row"),
        ],
      },
      { muscle: "Rear delts", exercises: [ex("face-pull", "Face pull")] },
      {
        muscle: "Biceps",
        exercises: [ex("cable-curl", "Cable curl"), ex("hammer-curl", "Hammer curl")],
      },
    ],
  },
  { short: "Sat", name: "Saturday", title: "Legs · Shoulders", groups: legsShoulders },
];
