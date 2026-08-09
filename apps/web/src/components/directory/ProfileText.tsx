import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Sichere Markdown-Darstellung nutzergenerierter Profiltexte: Links + Aufzählungen + Absätze.
 * KEIN rehype-raw → kein Roh-HTML/XSS. react-markdown v10 sanitisiert URLs (blockt javascript: etc.).
 * Externe Links öffnen in neuem Tab mit rel="nofollow noopener".
 */
export default function ProfileText({ content }: { content: string }) {
  return (
    <div className="text-[0.92rem] leading-relaxed text-brand-text [&_a]:text-accent [&_a]:underline [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 last:[&_p]:mb-0 [&_li]:mb-1 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="nofollow noopener noreferrer">{children}</a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
