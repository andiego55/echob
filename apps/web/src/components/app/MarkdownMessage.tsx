import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <p className="font-bold text-navy text-[1.05rem] mt-4 first:mt-0 mb-1.5">{children}</p>
        ),
        h2: ({ children }) => (
          <p className="font-bold text-navy text-[0.98rem] mt-4 first:mt-0 mb-1.5">{children}</p>
        ),
        h3: ({ children }) => (
          <p className="font-semibold text-navy mt-3 first:mt-0 mb-1">{children}</p>
        ),
        p: ({ children }) => (
          <p className="mb-2.5 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-navy">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => (
          <ul className="list-disc pl-5 mb-2.5 last:mb-0 space-y-1 marker:text-accent">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-5 mb-2.5 last:mb-0 space-y-1 marker:text-accent marker:font-semibold">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-accent/50 pl-3.5 my-2.5 italic text-brand-muted">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="bg-navy/[0.06] rounded px-1.5 py-0.5 text-[0.85em] font-mono text-navy">
            {children}
          </code>
        ),
        hr: () => <hr className="my-3 border-brand-border" />,
        table: ({ children }) => (
          <div className="my-2.5 overflow-x-auto">
            <table className="w-full border-collapse text-[0.92em]">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead>{children}</thead>,
        th: ({ children }) => (
          <th className="border-b border-brand-border px-2.5 py-1.5 text-left font-semibold text-navy align-top">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border-b border-brand-border/50 px-2.5 py-1.5 align-top">{children}</td>
        ),
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-accent-hover">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
