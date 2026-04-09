// Parse macOS LaunchAgent plist XML — extract label, script, schedule

export interface ParsedPlist {
  label: string;
  script_path: string;
  schedule: string;
  stdout_path?: string;
  stderr_path?: string;
  working_directory?: string;
}

export function parsePlistXml(xml: string): ParsedPlist | null {
  const getVal = (key: string): string | null => {
    const re = new RegExp(`<key>${key}</key>\\s*<(?:string|integer)>([^<]+)</`, "s");
    const m = xml.match(re);
    return m ? m[1].trim() : null;
  };

  const label = getVal("Label");
  if (!label) return null;

  // Extract ProgramArguments array
  const argsMatch = xml.match(/<key>ProgramArguments<\/key>\s*<array>([\s\S]*?)<\/array>/);
  const args: string[] = [];
  if (argsMatch) {
    const strings = argsMatch[1].matchAll(/<string>([^<]+)<\/string>/g);
    for (const s of strings) args.push(s[1]);
  }
  const script_path = args.find((a) => a.endsWith(".sh") || a.endsWith(".py")) || args.join(" ");

  // Parse schedule from StartCalendarInterval
  const scheduleMatch = xml.match(/<key>StartCalendarInterval<\/key>\s*<dict>([\s\S]*?)<\/dict>/);
  let schedule = "";
  if (scheduleMatch) {
    const hour = scheduleMatch[1].match(/<key>Hour<\/key>\s*<integer>(\d+)/);
    const minute = scheduleMatch[1].match(/<key>Minute<\/key>\s*<integer>(\d+)/);
    const weekday = scheduleMatch[1].match(/<key>Weekday<\/key>\s*<integer>(\d+)/);
    const parts: string[] = [];
    if (hour) parts.push(`${hour[1].padStart(2, "0")}:${minute ? minute[1].padStart(2, "0") : "00"}`);
    if (weekday) {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      parts.push(days[parseInt(weekday[1])] || `day${weekday[1]}`);
    }
    schedule = parts.join(" ") || "daily";
  }

  // StartInterval (every N seconds)
  const intervalMatch = xml.match(/<key>StartInterval<\/key>\s*<integer>(\d+)/);
  if (intervalMatch) {
    const sec = parseInt(intervalMatch[1]);
    if (sec >= 3600) schedule = `every ${sec / 3600}h`;
    else if (sec >= 60) schedule = `every ${sec / 60}min`;
    else schedule = `every ${sec}s`;
  }

  return {
    label,
    script_path,
    schedule: schedule || "unknown",
    stdout_path: getVal("StandardOutPath") || undefined,
    stderr_path: getVal("StandardErrorPath") || undefined,
    working_directory: getVal("WorkingDirectory") || undefined,
  };
}
