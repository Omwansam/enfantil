import { Menu } from 'lucide-react'
import { Suspense, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import Drawer from '../components/Drawer'
import Logo from '../components/Logo'
import PageLoader from '../components/PageLoader'
import Sidebar from '../components/Sidebar'

/** Signed-in shell: fixed 248px deep-teal sidebar from 1024px; top bar and slide-over drawer below. */
export default function ClinicLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeDrawer = () => setDrawerOpen(false)

  return (
    <div className="min-h-dvh bg-page lg:pl-[248px]">
      <a
        href="#main"
        className="sr-only z-50 rounded-xl bg-white px-4 py-3 font-semibold text-teal-700 shadow-pop focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <aside aria-label="Sidebar" className="fixed inset-y-0 left-0 z-30 hidden w-[248px] bg-portal lg:flex">
        <Sidebar />
      </aside>

      <header className="on-portal sticky top-0 z-20 flex h-16 items-center justify-between bg-portal px-4 lg:hidden">
        <Link to="/clinic" aria-label="Enfantil clinician portal, dashboard" className="rounded-lg">
          <Logo />
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          className="inline-flex size-11 items-center justify-center rounded-xl border border-white/15 text-white hover:bg-white/8"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </header>

      <Drawer open={drawerOpen} onClose={closeDrawer} label="Menu">
        <Sidebar onNavigate={closeDrawer} />
      </Drawer>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1320px] px-4 py-6 outline-none sm:px-6 lg:px-10 lg:py-7">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
