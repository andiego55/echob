import ReactMarkdown from 'react-markdown'

interface Props {
  content: string
  isUser?: boolean
}

export default function MarkdownMessage({ content, isUser = false }: Props) {
  if (isUser) {
    return <p className="whitespace-pre-wrap">{content}</p>
  }

  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <p className="font-bold text-base mb-1">{children}</p>,
        h2: ({ children }) => <p className="font-bold text-sm mb-1">{children}</p>,
        h3: ({ children }) => <p className="font-semibold text-sm mb-0.5">{children}</p>,
        p:  ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="text-sm">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-accent/40 pl-3 italic text-brand-muted my-2">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="bg-black/5 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
