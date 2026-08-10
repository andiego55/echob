/**
 * Geteiltes Strichicon-Set für den Fachpersonenbereich – eine Quelle der Wahrheit,
 * gleicher Linien-Stil wie Dashboard-Kacheln und Homepage. Größe via className
 * (Default 15px). So bleiben Postfach, Fall-Detail & Co. konsistent.
 */
type P = { className?: string }
const DEF = 'h-[15px] w-[15px]'
const attrs = (className?: string) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: className ?? DEF,
})

export const IconClipboard = ({ className }: P) => (
  <svg {...attrs(className)}><path d="M9 4H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" /><rect x="8" y="2.5" width="8" height="4" rx="1" /><path d="m8.5 13 2 2 4-4" /></svg>
)
export const IconChat = ({ className }: P) => (
  <svg {...attrs(className)}><path d="M21 11.5a8.5 8.5 0 0 1-11.9 7.8L3 21l1.7-5.1A8.5 8.5 0 1 1 21 11.5Z" /></svg>
)
export const IconMail = ({ className }: P) => (
  <svg {...attrs(className)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7.5 8 5.5 8-5.5" /></svg>
)
export const IconInbox = ({ className }: P) => (
  <svg {...attrs(className)}><path d="M3 13h4l1.5 3h7L17 13h4" /><path d="M5 13 6.4 6.6A2 2 0 0 1 8.3 5h7.4a2 2 0 0 1 1.9 1.6L19 13" /><path d="M3 13v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" /></svg>
)
export const IconCalendar = ({ className }: P) => (
  <svg {...attrs(className)}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></svg>
)
export const IconClock = ({ className }: P) => (
  <svg {...attrs(className)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></svg>
)
export const IconLink = ({ className }: P) => (
  <svg {...attrs(className)}><path d="M9 15l6-6" /><path d="M10.5 6.5 12 5a4 4 0 0 1 6 6l-1.5 1.5" /><path d="M13.5 17.5 12 19a4 4 0 0 1-6-6l1.5-1.5" /></svg>
)
export const IconLock = ({ className }: P) => (
  <svg {...attrs(className)}><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
)
export const IconCheck = ({ className }: P) => (
  <svg {...attrs(className)}><path d="M20 6 9 17l-5-5" /></svg>
)
export const IconDoc = ({ className }: P) => (
  <svg {...attrs(className)}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>
)
export const IconChart = ({ className }: P) => (
  <svg {...attrs(className)}><path d="M6 20V12M12 20V6M18 20v-5" /></svg>
)
export const IconUsers = ({ className }: P) => (
  <svg {...attrs(className)}><circle cx="9" cy="8" r="3.2" /><path d="M2.5 19a6.5 6.5 0 0 1 13 0" /><path d="M16 5.5a2.9 2.9 0 0 1 0 5.4" /><path d="M17.5 13a5.5 5.5 0 0 1 4 5.3" /></svg>
)
export const IconEdit = ({ className }: P) => (
  <svg {...attrs(className)}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
)
export const IconPrinter = ({ className }: P) => (
  <svg {...attrs(className)}><path d="M6 9V4h12v5" /><rect x="4" y="9" width="16" height="8" rx="2" /><path d="M8 15h8v5H8z" /><path d="M17 12h.01" /></svg>
)
export const IconSparkles = ({ className }: P) => (
  <svg {...attrs(className)}><path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z" /><path d="M18.5 13.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z" /></svg>
)
