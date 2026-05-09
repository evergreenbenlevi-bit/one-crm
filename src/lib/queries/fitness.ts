import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export const getFitnessData = unstable_cache(
  async (days: number = 30) => {
    const supabase = createAdminClient();
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split("T")[0];

    const [benHealthRes, evyatarHealthRes, benWorkoutsRes, evyatarWorkoutsRes] = await Promise.all([
      supabase
        .from("health_daily_logs")
        .select("date, weight_kg, steps, water_liters, sleep_hours")
        .eq("user_id", "ben")
        .gte("date", sinceStr)
        .order("date", { ascending: true }),
      supabase
        .from("health_daily_logs")
        .select("date, weight_kg, steps, water_liters, sleep_hours")
        .eq("user_id", "evyatar")
        .gte("date", sinceStr)
        .order("date", { ascending: true }),
      supabase
        .from("ben_workout_logs")
        .select("date, exercise, sets, reps, weight_kg")
        .gte("date", sinceStr)
        .order("date", { ascending: true }),
      supabase
        .from("avitar_workout_logs")
        .select("date, exercise, sets, reps, weight_kg")
        .gte("date", sinceStr)
        .order("date", { ascending: true }),
    ]);

    const benHealth = benHealthRes.data || [];
    const evyatarHealth = evyatarHealthRes.data || [];
    const benWorkouts = benWorkoutsRes.data || [];
    const evyatarWorkouts = evyatarWorkoutsRes.data || [];

    // Weekly workout counts
    const countByWeek = (logs: { date: string }[]) => {
      const weeks: Record<string, number> = {};
      logs.forEach((l) => {
        const d = new Date(l.date);
        const mon = new Date(d);
        mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        const key = mon.toISOString().split("T")[0];
        weeks[key] = (weeks[key] || 0) + 1;
      });
      return Object.entries(weeks)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, count]) => ({ week, count }));
    };

    // Latest stats
    const latestBen = benHealth[benHealth.length - 1];
    const latestAvitar = evyatarHealth[evyatarHealth.length - 1];

    return {
      ben: {
        health: benHealth,
        workouts: benWorkouts,
        weeklyWorkouts: countByWeek(benWorkouts),
        latest: latestBen || null,
        totalWorkouts: benWorkouts.length,
        avgSteps: benHealth.length
          ? Math.round(benHealth.reduce((s, d) => s + (d.steps || 0), 0) / benHealth.length)
          : 0,
      },
      evyatar: {
        health: evyatarHealth,
        workouts: evyatarWorkouts,
        weeklyWorkouts: countByWeek(evyatarWorkouts),
        latest: latestAvitar || null,
        totalWorkouts: evyatarWorkouts.length,
        avgSteps: evyatarHealth.length
          ? Math.round(evyatarHealth.reduce((s, d) => s + (d.steps || 0), 0) / evyatarHealth.length)
          : 0,
      },
    };
  },
  ["fitness-data"],
  { revalidate: 300 }
);
