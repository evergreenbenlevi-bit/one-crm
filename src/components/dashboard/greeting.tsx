"use client";

import { useEffect, useState } from "react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "בוקר טוב";
  if (hour >= 12 && hour < 17) return "צהריים טובים";
  return "ערב טוב";
}

interface GreetingProps {
  achievement?: string;
}

export function Greeting({ achievement }: GreetingProps) {
  const [greeting, setGreeting] = useState("שלום");

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold">{greeting}, נועם</h1>
      {achievement && (
        <p className="text-gray-500 mt-1">{achievement}</p>
      )}
    </div>
  );
}
