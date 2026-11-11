import { Minus, Plus } from 'lucide-react'
import { useId, useState } from 'react'
import { cx } from '../utils/cx'

/** FAQ accordion. items: [{ id, title, content, tag? }] */
export default function Accordion({ items, defaultOpenId = null, className, headingLevel = 3 }) {
  const [openId, setOpenId] = useState(defaultOpenId)
  const baseId = useId()
  const Heading = `h${headingLevel}`
  return (
    <div className={cx('divide-y divide-line', className)}>
      {items.map((item) => {
        const open = openId === item.id
        const buttonId = `${baseId}-${item.id}-button`
        const panelId = `${baseId}-${item.id}-panel`
        return (
          <div key={item.id}>
            <Heading className="m-0">
              <button
                id={buttonId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenId(open ? null : item.id)}
                className="flex min-h-14 w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-[#FAFAF8]"
              >
                {item.tag}
                <span className="flex-1 text-[15px] font-semibold text-ink">{item.title}</span>
                {open ? (
                  <Minus className="size-[18px] shrink-0 text-slate-600" aria-hidden="true" />
                ) : (
                  <Plus className="size-[18px] shrink-0 text-slate-600" aria-hidden="true" />
                )}
              </button>
            </Heading>
            <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open} className={cx('px-5 pb-4 text-[14px] leading-6 text-slate-600')}>
              {item.content}
            </div>
          </div>
        )
      })}
    </div>
  )
}
