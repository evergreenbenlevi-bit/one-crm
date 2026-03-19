"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { SUGGESTED_TAGS } from "@/lib/types/tasks";
import { clsx } from "clsx";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState("");

  function addTag(tag: string) {
    const clean = tag.trim().toLowerCase().replace(/\s+/g, "-");
    if (!clean || tags.includes(clean)) return;
    onChange([...tags, clean]);
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter(t => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  const suggestions = SUGGESTED_TAGS.filter(s => !tags.includes(s));

  return (
    <div className="space-y-2">
      {/* Existing tags + input */}
      <div className={clsx(
        "flex flex-wrap gap-1.5 min-h-[38px] px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-600",
        "bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-brand-400 focus-within:border-transparent transition-shadow"
      )}>
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full font-mono border border-brand-100 dark:border-brand-800">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-red-500 transition-colors"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? "#tag — Enter להוספה" : ""}
          className="flex-1 min-w-[100px] bg-transparent text-xs text-gray-700 dark:text-gray-200 outline-none placeholder:text-gray-400"
        />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.slice(0, 5).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-700 hover:bg-brand-50 dark:hover:bg-brand-900/30 text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 rounded-full font-mono transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
