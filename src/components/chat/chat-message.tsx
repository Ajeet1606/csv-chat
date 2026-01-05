"use client"

interface ChatMessageProps {
  message: {
    type: "user" | "assistant"
    content: string
    timestamp: Date
  }
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.type === "user"

  return (
    <div className="flex justify-end">
      <div
        className={`bg-${isUser ? "primary" : "secondary"} text-${isUser ? "primary-foreground" : "secondary-foreground"} rounded-lg px-4 py-3 max-w-2xl text-sm`}
      >
        <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <span className="text-xs mt-2 block opacity-70">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  )
}
