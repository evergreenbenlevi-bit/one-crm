import { streamText, convertToModelMessages } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: `אתה ONE-AI, העוזר האישי של בן ב-ONE-CRM.
אתה עוזר לנהל לידים, לקוחות, ומשימות.
תמיד תענה בעברית, קצר וממוקד.
אם אין לך מידע ספציפי, אמור זאת ישר.`,
    messages: modelMessages,
  })

  return result.toUIMessageStreamResponse()
}
