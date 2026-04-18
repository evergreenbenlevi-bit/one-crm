"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Scale, Footprints, Dumbbell, Droplets } from "lucide-react";

type HealthLog = {
  date: string;
  weight_kg: number | null;
  steps: number | null;
  water_liters: number | null;
  sleep_hours: number | null;
};

type WeeklyCount = { week: string; count: number };

type UserData = {
  health: HealthLog[];
  workouts: { date: string; exercise: string }[];
  weeklyWorkouts: WeeklyCount[];
  latest: HealthLog | null;
  totalWorkouts: number;
  avgSteps: number;
};

interface FitnessClientProps {
  data: { ben: UserData; avitar: UserData };
}

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-4 flex items-center gap-4">
      <div className="bg-primary/10 rounded-lg p-2.5">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function UserSection({ name, data, color }: { name: string; data: UserData; color: string }) {
  const weightData = data.health.filter((d) => d.weight_kg).map((d) => ({
    date: d.date.slice(5),
    weight: d.weight_kg,
  }));
  const stepsData = data.health.filter((d) => d.steps).map((d) => ({
    date: d.date.slice(5),
    steps: d.steps,
  }));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{name}</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="משקל אחרון"
          value={data.latest?.weight_kg ? `${data.latest.weight_kg} kg` : "—"}
          icon={Scale}
        />
        <StatCard
          label="צעדים ממוצע"
          value={data.avgSteps ? `${data.avgSteps.toLocaleString()}` : "—"}
          icon={Footprints}
          sub="30 יום אחרון"
        />
        <StatCard
          label="אימונים (30 יום)"
          value={String(data.totalWorkouts)}
          icon={Dumbbell}
        />
        <StatCard
          label="מים אחרון"
          value={data.latest?.water_liters ? `${data.latest.water_liters} ל` : "—"}
          icon={Droplets}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {weightData.length > 0 && (
          <div className="bg-card border rounded-xl p-4">
            <h3 className="text-sm font-medium mb-3">משקל (kg)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="weight" stroke={color} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {stepsData.length > 0 && (
          <div className="bg-card border rounded-xl p-4">
            <h3 className="text-sm font-medium mb-3">צעדים יומיים</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stepsData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="steps" fill={color} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {data.weeklyWorkouts.length > 0 && (
          <div className="bg-card border rounded-xl p-4 md:col-span-2">
            <h3 className="text-sm font-medium mb-3">אימונים שבועיים</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.weeklyWorkouts}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill={color} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {weightData.length === 0 && stepsData.length === 0 && data.weeklyWorkouts.length === 0 && (
          <div className="bg-card border rounded-xl p-6 text-center text-muted-foreground text-sm md:col-span-2">
            אין נתונים ל-30 יום האחרונים עדיין
          </div>
        )}
      </div>
    </div>
  );
}

export function FitnessClient({ data }: FitnessClientProps) {
  return (
    <div className="space-y-10">
      <UserSection name="בן" data={data.ben} color="#6366f1" />
      <hr className="border-border" />
      <UserSection name="אביתר" data={data.avitar} color="#10b981" />
    </div>
  );
}
