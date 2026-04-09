"use client";

import { useState, type ReactNode } from "react";
import { Tabs } from "@/components/ui/tabs";
import { ReceiptsTable } from "./receipts-table";
import { PersonalExpenses } from "./personal-expenses";

const tabs = [
  { key: "overview", label: "סקירה כללית" },
  { key: "receipts", label: "קבלות" },
  { key: "personal", label: "הוצאות אישיות" },
];

interface FinancialTabsProps {
  overviewContent: ReactNode;
}

export function FinancialTabs({ overviewContent }: FinancialTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <>
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "overview" && overviewContent}
      {activeTab === "receipts" && <ReceiptsTable />}
      {activeTab === "personal" && <PersonalExpenses />}
    </>
  );
}
