import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useStore } from '../data/store'
import { Avatar } from './components/Avatar'
import { ImportBanner } from './components/ImportBanner'

const pages = [
  { to: '/', label: 'Game' },
  { to: '/history', label: 'History' },
  { to: '/stats', label: 'Stats' },
  { to: '/players', label: 'Players' },
  { to: '/rules', label: 'Rules' },
]

export function Layout() {
  const user = useStore((s) => s.user)
  const loading = useStore((s) => s.loading)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // Close the menu whenever the page changes.
  useEffect(() => setOpen(false), [location])

  return (
    <div className="flex h-full flex-col">
      <header className="relative z-20 border-b border-line bg-surface">
        <div className="mx-auto flex h-12 max-w-3xl items-center gap-2 px-4">
          <NavLink to="/" className="flex-1 text-lg font-bold">
            Gursch
          </NavLink>

          {/* Desktop: links in the header. */}
          <nav className="hidden items-center gap-1 sm:flex">
            {pages.map((p) => (
              <NavLink
                key={p.to}
                to={p.to}
                end={p.to === '/'}
                className={({ isActive }) => `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'text-accent' : 'text-muted'}`}
              >
                {p.label}
              </NavLink>
            ))}
            <NavLink
              to="/account"
              aria-label="Account"
              className={({ isActive }) => `ml-1 flex items-center px-1 text-sm font-medium ${isActive ? 'text-accent' : 'text-muted'}`}
            >
              {user ? <Avatar name={user.name} avatar={user.photo} size={30} /> : 'Account'}
            </NavLink>
          </nav>

          {/* Mobile: one menu button. */}
          <button
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg sm:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              {open ? <path d="M5 5l12 12M17 5L5 17" /> : <path d="M3 6h16M3 11h16M3 16h16" />}
            </svg>
          </button>
        </div>

        {open && (
          <nav className="absolute inset-x-0 top-full border-b border-line bg-surface shadow-lg sm:hidden">
            {[...pages, { to: '/account', label: user ? `Account (${user.name})` : 'Account' }].map((p) => (
              <NavLink
                key={p.to}
                to={p.to}
                end={p.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex h-13 items-center border-t border-line px-4 text-base font-medium ${isActive ? 'text-accent' : ''}`
                }
              >
                {p.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {open && <button className="fixed inset-0 z-10 bg-black/30 sm:hidden" aria-label="Close menu" onClick={() => setOpen(false)} />}

      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto max-w-3xl px-4 py-5">
          {loading ? (
            <p className="text-muted">Loading your data…</p>
          ) : (
            <>
              <ImportBanner />
              <Outlet />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
