const ACTION_VERBS = [
  'build', 'write', 'fix', 'create', 'review', 'send', 'update', 'research',
  'call', 'design', 'implement', 'test', 'deploy', 'setup', 'configure',
  'add', 'remove', 'refactor', 'check', 'analyze', 'plan', 'schedule',
  'connect', 'integrate', 'migrate', 'optimize', 'debug', 'document',
  'prepare', 'draft', 'outline', 'map', 'audit', 'explore', 'define',
  'finalize', 'launch', 'ship', 'push', 'pull', 'merge', 'close',
  'interview', 'onboard', 'follow', 'record', 'edit', 'publish',
  // Hebrew verbs
  'לבנות', 'לכתוב', 'לתקן', 'ליצור', 'לבדוק', 'לשלוח', 'לעדכן', 'לחקור',
  'להתקשר', 'לעצב', 'לממש', 'לפרוס', 'להגדיר', 'להוסיף',
  'להסיר', 'לנתח', 'לתכנן', 'לתזמן', 'לחבר', 'לשלב', 'לייעל',
  'להכין', 'לסקור', 'לבחון', 'לפתח', 'להשיק', 'לבצע', 'לחקות',
  'לרשום', 'לערוך', 'לפרסם', 'להריץ', 'לאסוף', 'לסכם',
];

export interface TitleQualityResult {
  isGood: boolean;
  issues: string[];
}

export function checkTitleQuality(title: string): TitleQualityResult {
  const issues: string[] = [];
  const trimmed = title.trim();

  if (trimmed.length < 10) {
    issues.push('Title too short (min 10 chars)');
  }

  const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
  const hasActionVerb = ACTION_VERBS.some(v =>
    firstWord === v || firstWord.startsWith(v)
  );

  if (!hasActionVerb && trimmed.length >= 10) {
    issues.push('Should start with an action verb');
  }

  return { isGood: issues.length === 0, issues };
}
