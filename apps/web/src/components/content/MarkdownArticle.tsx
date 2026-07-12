import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Rendert Artikel-Markdown zu semantischem HTML (h2/p/ul/blockquote/…), das von
 * der `prose-article`-Typografie gestylt wird. SSR-fest (kein rohes HTML, kein
 * rehype-raw → kein XSS über Content).
 */
export default function MarkdownArticle({ content }: { content: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
}
