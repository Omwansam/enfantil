import { cx } from '../utils/cx'

/**
 * Grid of bookable times (role="radiogroup"). Taken and past slots are
 * disabled; taken ones are struck through and labelled for screen readers.
 */
export default function TimeSlotGrid({ slots, value, onChange, label, name = 'time', error }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[14px] font-semibold text-ink">{label}</legend>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" role="radiogroup" aria-label={label} aria-invalid={error ? true : undefined}>
        {slots.map((slot) => {
          const disabled = slot.taken || slot.past
          const selected = value === slot.time
          return (
            <label
              key={slot.time}
              className={cx(
                'focus-within-ring relative flex min-h-10 items-center justify-center rounded-[10px] border text-[14px] font-semibold tabular-nums transition-colors',
                disabled && 'cursor-not-allowed border-line bg-[#F4F3F0] text-[#8A8F98]',
                slot.taken && 'line-through decoration-[1.5px]',
                !disabled && !selected && 'cursor-pointer border-line bg-white text-ink hover:border-teal-700 hover:bg-teal-50',
                selected && 'border-teal-700 bg-teal-700 text-white',
              )}
            >
              <input
                type="radio"
                name={name}
                value={slot.time}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(slot.time)}
                className="sr-only"
              />
              {slot.time}
              {slot.taken && <span className="sr-only"> (taken)</span>}
              {!slot.taken && slot.past && <span className="sr-only"> (passed)</span>}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
