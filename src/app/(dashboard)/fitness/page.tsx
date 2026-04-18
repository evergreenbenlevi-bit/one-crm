import { Suspense } from "react";
import { Dumbbell } from "lucide-react";
import { getFitnessData } from "@/lib/queries/fitness";
import { FitnessClient } from "@/components/fitness/fitness-client";

export default async function FitnessPage() {
  const data = await getFitnessData(30);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Dumbbell className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Fitness Dashboard</h1>
      </div>
      <Suspense fallback={<div className="text-muted-foreground">טוען נתונים...</div>}>
        <FitnessClient data={data} />
      </Suspense>
    </div>
  );
}
