import { create } from 'zustand';

// ─── Save / Load helpers ───────────────────────────────────────────────────

const SAVE_KEY = 'terrarium_save_v1';

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildSavePayload(state) {
  return {
    inventory:      state.inventory,
    terrariumItems: state.terrariumItems,
    terrariumStats: state.terrariumStats,
    timeOfDay:      state.timeOfDay,
    respawnTimers:  state.respawnTimers,
    savedAt:        Date.now(),
  };
}

// ─── Defaults ─────────────────────────────────────────────────────────────

const DEFAULT_STATS      = { moisture: 50, light: 50 };
const DEFAULT_TIME       = 8; // start at 8 AM
const MINUTES_PER_HOUR  = 1; // 1 real minute = 1 game hour  →  full day = 24 real minutes
const RESPAWN_DELAY_MS   = 5 * 60 * 1000; // 5 real minutes

// ─── Rehydrate from localStorage ──────────────────────────────────────────

const saved = loadSave();

// ─── Store ────────────────────────────────────────────────────────────────

export const useGameStore = create((set, get) => ({
  // --- Scene Management ---
  currentScene: 'menu',
  setScene: (scene) => set({ currentScene: scene }),

  // --- Time of Day (0–24, wraps) ---
  timeOfDay: saved?.timeOfDay ?? DEFAULT_TIME,
  // Called every frame from a root R3F component
  tickTime: (deltaSeconds) => set((state) => {
    const hoursPerSecond = 1 / (MINUTES_PER_HOUR * 60);
    const next = (state.timeOfDay + deltaSeconds * hoursPerSecond) % 24;
    return { timeOfDay: next };
  }),

  // --- Inventory ---
  inventory: saved?.inventory ?? [],
  addToInventory: (item) => set((state) => ({
    inventory: [...state.inventory, item],
  })),
  removeFromInventory: (itemId) => set((state) => ({
    inventory: state.inventory.filter((i) => i.id !== itemId),
  })),

  // --- Terrarium Contents ---
  terrariumItems: saved?.terrariumItems ?? [],
  placeItemInTerrarium: (item) => set((state) => {
    const newInventory      = state.inventory.filter((i) => i.id !== item.id);
    const newTerrariumItems = [
      ...state.terrariumItems,
      { ...item, placedAt: Date.now() },
    ];
    const deltas = item.statEffect || {};
    return {
      inventory: newInventory,
      terrariumItems: newTerrariumItems,
      terrariumStats: {
        moisture: Math.min(100, Math.max(0, state.terrariumStats.moisture + (deltas.moisture || 0))),
        light:    Math.min(100, Math.max(0, state.terrariumStats.light    + (deltas.light    || 0))),
      },
    };
  }),

  // --- Terrarium Stats ---
  terrariumStats: saved?.terrariumStats ?? DEFAULT_STATS,
  updateTerrariumStats: (newStats) =>
    set((state) => ({ terrariumStats: { ...state.terrariumStats, ...newStats } })),

  // --- Respawn Timers ---
  // { [itemId]: readyAt (ms timestamp) }
  respawnTimers: saved?.respawnTimers ?? {},

  startRespawnTimer: (itemId) =>
    set((state) => ({
      respawnTimers: {
        ...state.respawnTimers,
        [itemId]: Date.now() + RESPAWN_DELAY_MS,
      },
    })),

  clearRespawnTimer: (itemId) =>
    set((state) => {
      const next = { ...state.respawnTimers };
      delete next[itemId];
      return { respawnTimers: next };
    }),

  // Returns ms remaining (0 if ready)
  getRespawnRemaining: (itemId) => {
    const readyAt = get().respawnTimers[itemId];
    if (!readyAt) return 0;
    return Math.max(0, readyAt - Date.now());
  },

  // --- Save / Load / Reset ---
  saveGame: () => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(buildSavePayload(get())));
    } catch { /* quota exceeded, ignore */ }
  },

  resetSave: () => {
    localStorage.removeItem(SAVE_KEY);
    set({
      inventory:      [],
      terrariumItems: [],
      terrariumStats: DEFAULT_STATS,
      timeOfDay:      DEFAULT_TIME,
      respawnTimers:  {},
    });
  },
}));

// ─── Auto-save every 30 seconds ───────────────────────────────────────────

setInterval(() => {
  useGameStore.getState().saveGame();
}, 30_000);

// ─── Shared mutable key map (no re-renders needed) ────────────────────────

export const forestKeys = { left: false, right: false, action: false };

// ─── Time-of-day helpers (pure, so any component can import them) ─────────

/**
 * Returns an object with all lighting / sky values derived from `timeOfDay`.
 * timeOfDay: 0–24  (float, wraps)
 */
export function getTimeOfDayLighting(t) {
  // Normalise to [0, 1] over 24 h
  const h = t / 24;

  // Key colour stops (ambient + sky):
  //   0.0 = midnight  → deep blue-black
  //   0.17 = 4h dawn  → dark indigo
  //   0.25 = 6h dawn  → warm orange
  //   0.375 = 9h      → bright morning
  //   0.5 = noon      → full white-day
  //   0.625 = 15h     → afternoon gold
  //   0.75 = 18h dusk → deep orange / magenta
  //   0.875 = 21h     → purple twilight
  //   1.0 = midnight  → deep blue-black

  // Helper: lerp between two hex colours
  const lerp = (a, b, t) => {
    const ah = parseInt(a.slice(1), 16);
    const bh = parseInt(b.slice(1), 16);
    const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
    const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bv = Math.round(ab + (bb - ab) * t);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bv.toString(16).padStart(2,'0')}`;
  };

  const keyframes = [
    // [h, ambientColor, ambientIntensity, dirColor, dirIntensity, skyColor, fogColor]
    [0.00,  '#0a0e1e', 0.10, '#1a1f3c', 0.05, '#060a18', '#04060f'],
    [0.17,  '#10102a', 0.15, '#2a2050', 0.10, '#0c0a22', '#07050f'],
    [0.22,  '#3d2810', 0.25, '#c07040', 0.30, '#291408', '#180a04'],
    [0.29,  '#8f5030', 0.40, '#f09060', 0.60, '#6b2d10', '#3d1508'],
    [0.375, '#b8d4a0', 0.55, '#e8f5c8', 0.75, '#5a8050', '#1a3010'],
    [0.50,  '#c8e0b0', 0.70, '#fff8e8', 0.90, '#7ab060', '#1c3812'],
    [0.625, '#d0c890', 0.65, '#ffe080', 0.85, '#6a8830', '#1a3008'],
    [0.75,  '#c04820', 0.35, '#ff7040', 0.50, '#4a1808', '#200c04'],
    [0.85,  '#301040', 0.20, '#6030a0', 0.20, '#1a0828', '#0c0418'],
    [0.92,  '#0c0e28', 0.12, '#201840', 0.08, '#060818', '#030408'],
    [1.00,  '#0a0e1e', 0.10, '#1a1f3c', 0.05, '#060a18', '#04060f'],
  ];

  // Find surrounding pair
  let i = 0;
  while (i < keyframes.length - 1 && keyframes[i + 1][0] <= h) i++;
  const [h0, ac0, ai0, dc0, di0, sc0, fc0] = keyframes[i];
  const [h1, ac1, ai1, dc1, di1, sc1, fc1] = keyframes[Math.min(i + 1, keyframes.length - 1)];
  const span = h1 - h0 || 1;
  const f = Math.max(0, Math.min(1, (h - h0) / span));

  return {
    ambientColor:     lerp(ac0, ac1, f),
    ambientIntensity: ai0 + (ai1 - ai0) * f,
    dirColor:         lerp(dc0, dc1, f),
    dirIntensity:     di0 + (di1 - di0) * f,
    skyColor:         lerp(sc0, sc1, f),
    fogColor:         lerp(fc0, fc1, f),
    // Useful scalars
    dayness:          Math.max(0, Math.min(1, Math.sin(h * Math.PI))),  // 0 night, 1 noon
    isNight:          t < 5 || t > 21,
  };
}