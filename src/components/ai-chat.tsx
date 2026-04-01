'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState } from 'react'
import { MessageSquare, X, Send, Loader2 } from 'lucide-react'

export function AIChat() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || status === 'submitted' || status === 'streaming') return
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <>
      {/* כפתור צף — mobile: smaller icon above nav bar; desktop: full button bottom-left */}
      <button
        onClick={() => setOpen(!open)}
        className={[
          "fixed z-[60] bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all",
          // Mobile: 32px icon, positioned right side above mobile nav (64px) + 8px gap
          "bottom-[80px] right-4 p-1.5 lg:p-3",
          // Desktop: original position bottom-left
          "lg:bottom-6 lg:left-6 lg:right-auto",
        ].join(" ")}
        aria-label="פתח AI עוזר"
      >
        {open ? <X size={18} className="lg:hidden" /> : <MessageSquare size={18} className="lg:hidden" />}
        {open ? <X size={22} className="hidden lg:block" /> : <MessageSquare size={22} className="hidden lg:block" />}
      </button>

      {/* חלון צ'אט */}
      {open && (
        <div className="fixed bottom-[148px] right-4 lg:bottom-20 lg:left-6 lg:right-auto z-[60] w-80 h-[420px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col">
          {/* כותרת */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">ONE-AI</span>
          </div>

          {/* הודעות */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-gray-400 text-xs text-center mt-8">
                שאל אותי כל דבר על ה-CRM שלך
              </p>
            )}
            {messages.map(m => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
                  }`}
                >
                  {m.parts?.map((p, i) =>
                    p.type === 'text' ? <span key={i}>{p.text}</span> : null
                  )}
                </div>
              </div>
            ))}
            {(status === 'submitted' || status === 'streaming') && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2">
                  <Loader2 size={14} className="animate-spin text-gray-500" />
                </div>
              </div>
            )}
          </div>

          {/* שדה קלט */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="שאל משהו..."
              className="flex-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
              dir="rtl"
            />
            <button
              type="submit"
              disabled={!input.trim() || status === 'submitted' || status === 'streaming'}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg px-3 py-2 transition-all"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
