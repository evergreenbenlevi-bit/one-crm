"use client";

import { useState } from "react";
import { Bell, Shield, Database, Info } from "lucide-react";

const version = "1.0.0";

export default function SettingsPage() {
  const [webhookCopied, setWebhookCopied] = useState(false);

  async function copyWebhook() {
    const url = `${window.location.origin}/api/webhook/fillout`;
    await navigator.clipboard.writeText(url);
    setWebhookCopied(true);
    setTimeout(() => setWebhookCopied(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold dark:text-gray-100">הגדרות</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ניהול מערכת ONE™ CRM</p>
      </div>

      {/* Integrations */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-5">
          <Database size={18} className="text-brand-600 dark:text-brand-400" />
          <h2 className="font-semibold dark:text-gray-100">אינטגרציות</h2>
        </div>

        <div className="space-y-4">
          {/* Fillout webhook */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fillout Webhook URL
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              הדבק URL זה ב-Fillout כדי שהרשמות יגיעו אוטומטית לCRM
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={typeof window !== "undefined" ? `${window.location.origin}/api/webhook/fillout` : "/api/webhook/fillout"}
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 text-sm font-mono focus:outline-none"
                dir="ltr"
              />
              <button
                onClick={copyWebhook}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors whitespace-nowrap"
              >
                {webhookCopied ? "✓ הועתק" : "העתק"}
              </button>
            </div>
          </div>

          {/* Cardcom */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cardcom / uPay Webhook URL
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              חבר כדי לרשום תשלומים אוטומטית
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={typeof window !== "undefined" ? `${window.location.origin}/api/webhook/cardcom` : "/api/webhook/cardcom"}
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 text-sm font-mono focus:outline-none"
                dir="ltr"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-5">
          <Shield size={18} className="text-brand-600 dark:text-brand-400" />
          <h2 className="font-semibold dark:text-gray-100">אבטחה</h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium dark:text-gray-200">הרשאות</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Admin — גישה מלאה</div>
            </div>
            <span className="text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full font-medium">
              פעיל
            </span>
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium dark:text-gray-200">Service Role Key</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">נדרש לאימות Webhook</div>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? "מוגדר" : "לא מוגדר"}
            </span>
          </div>
        </div>
      </div>

      {/* Notifications placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 opacity-60">
        <div className="flex items-center gap-2 mb-2">
          <Bell size={18} className="text-gray-400 dark:text-gray-500" />
          <h2 className="font-semibold dark:text-gray-300">התראות</h2>
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">בקרוב</span>
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          התראות על לידים חדשים, פגישות קרובות, ולקוחות לטיפול
        </p>
      </div>

      {/* About */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Info size={18} className="text-brand-600 dark:text-brand-400" />
          <h2 className="font-semibold dark:text-gray-100">אודות</h2>
        </div>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex justify-between">
            <span>גרסה</span>
            <span className="font-mono">{version}</span>
          </div>
          <div className="flex justify-between">
            <span>מסד נתונים</span>
            <span>Supabase (PostgreSQL)</span>
          </div>
          <div className="flex justify-between">
            <span>פלטפורמה</span>
            <span>Next.js 15 / Vercel</span>
          </div>
        </div>
      </div>
    </div>
  );
}
