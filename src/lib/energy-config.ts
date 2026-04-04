/**
 * Energy-Based Scheduling System
 * Wolf chronotype (Ben's actual pattern)
 * Maps time of day → energy level → suitable task types
 */

import type { TaskImpact, TaskCategory, EstimatedMinutes } from "./types/tasks";

export type EnergyLevel = "high" | "medium" | "low" | "dead";

export interface EnergyWindow {
  start: number; // Hour (0-23)
  end: number;   // Hour (0-23)
  level: EnergyLevel;
  label: string;
  suitableFor: string[];
}

// Wolf chronotype — Ben's energy pattern
export const ENERGY_WINDOWS: EnergyWindow[] = [
  { start: 0, end: 2, level: "high", label: "Deep Night Focus", suitableFor: ["needle_mover", "complex", "deep_work"] },
  { start: 2, end: 5, level: "dead", label: "שינה", suitableFor: [] },
  { start: 5, end: 7, level: "dead", label: "Dead Zone", suitableFor: [] },
  { start: 7, end: 11, level: "low", label: "בוקר — אדמין", suitableFor: ["admin", "simple", "errands", "personal"] },
  { start: 11, end: 13, level: "medium", label: "חימום", suitableFor: ["medium", "meetings", "errands"] },
  { start: 13, end: 16, level: "high", label: "שיא אחה״צ", suitableFor: ["needle_mover", "complex", "deep_work", "one_tm"] },
  { start: 16, end: 20, level: "medium", label: "אחה״צ", suitableFor: ["medium", "content", "brand"] },
  { start: 20, end: 23, level: "low", label: "ערב — קל", suitableFor: ["simple", "admin", "review", "personal"] },
  { start: 23, end: 24, level: "medium", label: "לפני לילה", suitableFor: ["medium", "research"] },
];

// Tuesday 11:00-14:00 = fixed errands window
const TUESDAY_ERRANDS: EnergyWindow = {
  start: 11, end: 14, level: "low", label: "חלון סידורים (שלישי)",
  suitableFor: ["errands", "personal", "health"],
};

/**
 * Get energy level for a specific hour (and optionally day of week).
 * dayOfWeek: 0=Sunday, 1=Monday, 2=Tuesday, ...
 */
export function getEnergyLevel(hour: number, dayOfWeek?: number): EnergyLevel {
  // Tuesday errands override
  if (dayOfWeek === 2 && hour >= 11 && hour < 14) {
    return "low"; // errands window
  }
  const window = ENERGY_WINDOWS.find((w) => hour >= w.start && hour < w.end);
  return window?.level ?? "low";
}

/**
 * Get energy window details for a specific hour.
 */
export function getEnergyWindow(hour: number, dayOfWeek?: number): EnergyWindow {
  if (dayOfWeek === 2 && hour >= 11 && hour < 14) {
    return TUESDAY_ERRANDS;
  }
  return ENERGY_WINDOWS.find((w) => hour >= w.start && hour < w.end) ?? ENERGY_WINDOWS[3]; // default: morning admin
}

/**
 * Determine what energy level a task requires.
 */
export function taskEnergyRequirement(task: {
  impact?: TaskImpact | null;
  category?: TaskCategory | null;
  estimated_minutes?: EstimatedMinutes | null;
}): EnergyLevel {
  // Needle movers always need high energy
  if (task.impact === "needle_mover") return "high";

  // Errands and personal tasks are low energy
  if (task.category === "errands" || task.category === "personal") return "low";

  // Short tasks (5-15 min) are low energy
  if (task.estimated_minutes && task.estimated_minutes <= 15) return "low";

  // Long tasks (90+ min) need high energy / deep focus
  if (task.estimated_minutes && task.estimated_minutes >= 90) return "high";

  // Default: medium
  return "medium";
}

/**
 * Check if a task needs business hours (clinics, banks, errands).
 */
function needsBusinessHours(category?: TaskCategory | null): boolean {
  return category === "errands" || category === "personal";
}

/**
 * Suggest time slots for a task on a given date.
 * Returns up to 3 suggested slots sorted by best fit.
 */
export function suggestTimeSlots(
  task: {
    impact?: TaskImpact | null;
    category?: TaskCategory | null;
    estimated_minutes?: EstimatedMinutes | null;
  },
  date: Date
): { start: string; end: string; label: string; energyLevel: EnergyLevel }[] {
  const dayOfWeek = date.getDay();
  const requiredEnergy = taskEnergyRequirement(task);
  const duration = task.estimated_minutes || 30;

  const slots: { start: string; end: string; label: string; energyLevel: EnergyLevel }[] = [];

  // Get applicable windows
  let windows = [...ENERGY_WINDOWS];
  if (dayOfWeek === 2) {
    // On Tuesday, inject errands window
    windows = windows.filter((w) => !(w.start >= 11 && w.end <= 14));
    windows.push(TUESDAY_ERRANDS);
    windows.sort((a, b) => a.start - b.start);
  }

  // Business hours exception: errands/personal go to 07:00-14:00
  if (needsBusinessHours(task.category)) {
    const businessWindows = windows.filter((w) => w.start >= 7 && w.start < 14);
    for (const w of businessWindows) {
      if (w.level === "dead") continue;
      const startHour = Math.max(w.start, 7);
      const endHour = Math.min(w.end, 14);
      if (endHour - startHour >= duration / 60) {
        slots.push({
          start: `${String(startHour).padStart(2, "0")}:00`,
          end: `${String(Math.min(startHour + Math.ceil(duration / 60), endHour)).padStart(2, "0")}:00`,
          label: w.label,
          energyLevel: w.level,
        });
      }
    }
    return slots.slice(0, 3);
  }

  // Match energy level: exact match first, then adjacent
  const energyPriority: Record<EnergyLevel, EnergyLevel[]> = {
    high: ["high", "medium"],
    medium: ["medium", "high", "low"],
    low: ["low", "medium"],
    dead: [],
  };

  const acceptableLevels = energyPriority[requiredEnergy];

  for (const level of acceptableLevels) {
    for (const w of windows) {
      if (w.level !== level) continue;
      if (w.level === "dead") continue;

      // Check if duration fits in this window
      const windowMinutes = (w.end - w.start) * 60;
      if (windowMinutes < duration) continue;

      // Suggest start at window beginning
      const startHour = w.start;
      const endMinutes = startHour * 60 + duration;
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;

      slots.push({
        start: `${String(startHour).padStart(2, "0")}:00`,
        end: `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`,
        label: w.label,
        energyLevel: w.level,
      });
    }
  }

  return slots.slice(0, 3);
}

/**
 * Get a human-readable energy label for display in the triage UI.
 */
export function energyLabel(level: EnergyLevel): string {
  switch (level) {
    case "high": return "🔥 אנרגיה גבוהה";
    case "medium": return "⚡ אנרגיה בינונית";
    case "low": return "🌙 אנרגיה נמוכה";
    case "dead": return "💀 Dead Zone";
  }
}
