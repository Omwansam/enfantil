import { Menu } from 'lucide-react'
import { Suspense, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import BottomTabs from '../components/BottomTabs'
import Drawer from '../components/Drawer'
import IconButton from '../components/IconButton'
import Logo from '../components/Logo'
import PageLoader from '../components/PageLoader'
import Sidebar from '../components/Sidebar'
import { ChildProvider } from '../context/ChildContext'

/** Signed-in shell: fixed 264px sidebar from 1024px, top bar + slide-over drawer below. */
export default function FamilyLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeDrawer = () => setDrawerOpen(false)

  return (
    <ChildProvider>
      <div className="min-h-dvh bg-page lg:pl-[264px] print:pl-0">
        <a
          href="#main"
          className="sr-only z-50 rounded-xl bg-white px-4 py-3 font-semibold text-teal-700 shadow-pop focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>

        <aside aria-label="Sidebar" className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-line bg-white lg:flex print:hidden">
          <Sidebar />
        </aside>

        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:hidden print:hidden">
          <Link to="/family" aria-label="Enfantil for families, overview" className="rounded-lg">
            <Logo tagline />
          </Link>
          <IconButton icon={Menu} label="Open menu" variant="outline" onClick={() => setDrawerOpen(true)} aria-expanded={drawerOpen} />
        </header>

        <Drawer open={drawerOpen} onClose={closeDrawer} label="Menu">
          <Sidebar onNavigate={closeDrawer} />
        </Drawer>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1260px] px-4 pb-28 pt-6 outline-none sm:px-6 lg:px-10 lg:py-8 print:max-w-none print:p-0">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>

        <BottomTabs />
      </div>
    </ChildProvider>
  )
}
