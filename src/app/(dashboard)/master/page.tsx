import { Metadata } from "next";
import { MasterTree } from "@/components/master/master-tree";

export const metadata: Metadata = {
  title: "Master Plan | ONE CRM",
};

export default function MasterPage() {
  return (
    <div className="max-w-2xl mx-auto px-3 py-4 sm:px-6 sm:py-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">Master Plan</h1>
        <p className="text-sm text-gray-500 mt-0.5">BENLEVI-MASTER — כל העסקים</p>
      </div>
      <MasterTree />
    </div>
  );
}
