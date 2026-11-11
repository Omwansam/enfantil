import { Paperclip } from 'lucide-react'
import { cx } from '../utils/cx'

/** Message bubble: the clinician's own messages on the right in teal, the other person's on the left in white. */
export default function ChatBubble({ mine, body, time, attachmentName, senderLabel }) {
  return (
    <div className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cx('max-w-[88%] rounded-2xl px-4 py-2.5 sm:max-w-[78%]', mine ? 'bg-teal-700 text-white' : 'border border-line bg-white text-ink')}>
        <span className="sr-only">{senderLabel}: </span>
        {attachmentName && (
          <span className={cx('mb-2 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium', mine ? 'bg-white/15' : 'bg-[#F4F3F0]')}>
            <Paperclip className="size-4 shrink-0" aria-hidden="true" />
            {attachmentName}
          </span>
        )}
        {body && <p className="whitespace-pre-wrap text-[15px] leading-6">{body}</p>}
        <p className={cx('mt-1 text-right text-[12px]', mine ? 'text-teal-50' : 'text-muted')}>{time}</p>
      </div>
    </div>
  )
}
