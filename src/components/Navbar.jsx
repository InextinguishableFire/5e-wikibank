import { Link, NavLink } from 'react-router-dom'
import useDarkMode from '../hooks/useDarkMode.js'

const TABS = [
  { label: 'Feats', to: '/feats' },
  { label: 'Items', to: '/items' },
  { label: 'Spells', to: '/spells' },
  { label: 'Card Maker', to: '/card-maker' },
  { label: 'Loot Generator', to: '/loot-generator' },
  { label: 'Bestiary', to: '/bestiary' },
  { label: 'Initiative', to: '/initiative' },
]

export default function Navbar() {
  const [isDark, toggleDark] = useDarkMode()

  return (
    <header className="w-full border-b border-red-950 bg-stone-900 text-stone-100 dark:border-[#2d2d30] dark:bg-[#252526] print:hidden">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 px-4">
        <Link to="/" className="order-1 py-3.5 text-lg font-bold tracking-wide md:py-4">
          5e WikiBank
        </Link>

        <button
          type="button"
          onClick={toggleDark}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="order-2 rounded border border-stone-700 bg-stone-800 px-3 py-1.5 text-xs font-medium text-stone-200 transition-colors hover:border-red-600 hover:text-white md:order-3 md:ml-auto dark:border-[#3e3e42] dark:bg-[#1e1e1e] dark:hover:border-[#569cd6]"
        >
          {isDark ? '☀ Light' : '☾ Dark'}
        </button>

        <ul className="order-3 flex w-full flex-wrap gap-x-1 border-t border-stone-800 pt-1 md:order-2 md:w-auto md:border-t-0 md:pt-0 dark:border-[#2d2d30]">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                className={({ isActive }) =>
                  `block border-b-4 px-2.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors md:px-3 md:py-4 ${
                    isActive
                      ? 'border-red-600 text-white dark:border-[#569cd6]'
                      : 'border-transparent text-stone-400 hover:text-white'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}