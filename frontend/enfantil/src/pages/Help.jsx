import { Mail, MessageCircle, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getHelpArticles } from '../api/help'
import Accordion from '../components/Accordion'
import Alert from '../components/Alert'
import AsyncContent from '../components/AsyncContent'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import { SkeletonList } from '../components/Skeleton'
import { fieldClass } from '../components/fieldStyles'
import { useAsync } from '../hooks/useAsync'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { cx } from '../utils/cx'

const SUPPORT_EMAIL = 'support@enfantil.app'

export default function Help() {
  useDocumentTitle('Help & support')
  const state = useAsync(getHelpArticles, [])
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState('All topics')

  const articles = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (state.data?.articles ?? []).filter(
      (a) => (topic === 'All topics' || a.topic === topic) && (!q || `${a.question} ${a.answer} ${a.topic}`.toLowerCase().includes(q)),
    )
  }, [state.data, query, topic])

  const topics = ['All topics', ...(state.data?.topics ?? [])]

  return (
    <>
      <section className="rounded-2xl bg-teal-50 p-6 sm:p-8" aria-labelledby="help-heading">
        <h1 id="help-heading" className="text-h1 sm:text-[30px] sm:leading-[38px]">
          How can we help?
        </h1>
        <form role="search" className="mt-5 max-w-[580px]" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="help-search" className="sr-only">
            Search help articles
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              id="help-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search, e.g. “change appointment” or “vaccination card”"
              className={fieldClass(false, 'min-h-12 border-teal-100 pl-12')}
            />
          </div>
        </form>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
          {topics.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={topic === t}
              onClick={() => setTopic(t)}
              className={cx(
                'min-h-11 rounded-full border px-4 text-[14px] font-semibold transition-colors',
                topic === t ? 'border-teal-700 bg-teal-700 text-white' : 'border-teal-100 bg-white text-teal-800 hover:border-teal-700',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
            <h2 className="text-h2">Frequently asked</h2>
            {state.data && (
              <p className="text-small text-slate-600" aria-live="polite">
                {articles.length} {articles.length === 1 ? 'answer' : 'answers'}
              </p>
            )}
          </div>
          <div className="border-t border-line">
            <AsyncContent
              state={state}
              errorTitle="We couldn’t load help articles"
              skeleton={<SkeletonList rows={6} avatar={false} label="Loading help" />}
              isEmpty={() => articles.length === 0}
              empty={
                <EmptyState
                  icon={Search}
                  title={query ? `No answers match “${query}”` : 'No answers in this topic yet'}
                  description="Try different words or another topic, or message your clinic."
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setQuery('')
                        setTopic('All topics')
                      }}
                    >
                      Clear search
                    </Button>
                  }
                />
              }
            >
              {() => (
                <Accordion
                  key={`${topic}-${query}`}
                  defaultOpenId={articles[0]?.id}
                  items={articles.map((a) => ({
                    id: a.id,
                    title: a.question,
                    content: a.answer,
                    tag: <Badge tone="given">{a.topic}</Badge>,
                  }))}
                />
              )}
            </AsyncContent>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-h2">Still need help?</h2>
            <div className="mt-4 space-y-3">
              <Button to="/family/messages" icon={MessageCircle} size="lg" fullWidth className="justify-start">
                Message your clinic
              </Button>
              <Button href={`mailto:${SUPPORT_EMAIL}`} variant="secondary" icon={Mail} size="lg" fullWidth className="justify-start">
                Email app support
              </Button>
            </div>
            <p className="mt-3 text-small text-slate-600">App support helps with sign-in and account problems. Health questions go to your clinic.</p>
          </Card>
          <Alert tone="coral" title="In an emergency," className="items-start">
            go to the nearest hospital. Messages are not monitored around the clock.
          </Alert>
        </div>
      </div>
    </>
  )
}
