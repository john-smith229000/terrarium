import { create } from 'zustand';

export const useGameStore = create((set) => ({
  // --- Scene Management ---
  currentScene: 'menu', // 'menu' | 'terrarium' | 'forest'
  setScene: (scene) => set({ currentScene: scene }),

  // --- Inventory (items carried from the forest) ---
  inventory: [],
  addToInventory: (item) => set((state) => ({
    inventory: [...state.inventory, item]
  })),
  removeFromInventory: (itemId) => set((state) => ({
    inventory: state.inventory.filter((item) => item.id !== itemId)
  })),

  // --- Terrarium Contents (items placed into the jar) ---
  terrariumItems: [],
  placeItemInTerrarium: (item) => set((state) => {
    const newInventory = state.inventory.filter((i) => i.id !== item.id);
    const newTerrariumItems = [...state.terrariumItems, { ...item, placedAt: Date.now() }];
    const statDeltas = item.statEffect || {};
    return {
      inventory: newInventory,
      terrariumItems: newTerrariumItems,
      terrariumStats: {
        moisture: Math.min(100, Math.max(0, state.terrariumStats.moisture + (statDeltas.moisture || 0))),
        light: Math.min(100, Math.max(0, state.terrariumStats.light + (statDeltas.light || 0))),
      }
    };
  }),

  // --- Terrarium Stats ---
  terrariumStats: {
    moisture: 50,
    light: 50,
  },
  updateTerrariumStats: (newStats) => set((state) => ({
    terrariumStats: { ...state.terrariumStats, ...newStats }
  })),
}));

// Shared mutable keys object for forest controls
// Not Zustand state (no re-renders needed) — just a plain shared ref
export const forestKeys = { left: false, right: false, action: false };