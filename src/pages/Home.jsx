import { Link } from 'react-router-dom'

const NAV_CARDS = [
  {
    label: 'Feats',
    to: '/feats',
    icon: '/feats_icon.svg',
  },
  {
    label: 'Items',
    to: '/items',
    icon: '/items_icon.svg',
  },
  {
  label: 'Spells',
  to: '/spells',
  icon: '/spells_icon.svg',
  },
  {
    label: 'Card Maker',
    to: '/card-maker',
    icon: '/card_maker_icon.svg',
  },
  {
    label: 'Loot Generator',
    to: '/loot-generator',
    icon: '/loot_gen_icon.svg',
  },
  {
  label: 'Bestiary',
  to: '/bestiary',
  icon: '/bestiary_icon.svg',
  },
  {
  label: 'Initiative',
  to: '/initiative',
  icon: '/initiative_icon.svg',
  },
]

export default function Home() {
  return (
    <section className="max-w-3xl">
      <h1 className="text-3xl font-bold">5e Wiki</h1>
      <p className="mt-4 text-stone-700">
        A quick reference for Dungeons &amp; Dragons 5th Edition. Search
        by name, filter by source book, build printable card decks, or roll random loot.
      </p>

      {/* Square Icon Navigation Tiles */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {NAV_CARDS.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="group flex aspect-square flex-col items-center justify-center gap-3 rounded-lg border border-stone-300 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-red-700 hover:bg-red-50 hover:shadow-md"
          >
            <img
              src={card.icon}
              alt=""
              aria-hidden="true"
              className="h-14 w-14 object-contain transition-transform group-hover:scale-105 dark:invert"
            />
            <span className="text-sm font-semibold text-stone-900 group-hover:text-red-900">
              {card.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Home-only Disclaimer & Attribution Footnote */}
      <aside className="mt-12 border-t border-stone-300 pt-6 text-xs leading-relaxed text-stone-500">
        <h2 className="font-semibold tracking-wide text-stone-700 uppercase">Disclaimer</h2>
        <p className="mt-1">
          This site is intended as an easily-accessible digital reference for products you already
          own. Please ensure you only access content in accordance with your local laws.
        </p>

        <p className="mt-3">
          Icons by{' '}
          <a
            href="https://game-icons.net/"
            target="_blank"
            rel="noreferrer"
            className="text-red-800 underline hover:text-red-700"
          >
            Delapouite
          </a>{' '}
          under{' '}
          <a
            href="https://creativecommons.org/licenses/by/3.0/"
            target="_blank"
            rel="noreferrer"
            className="text-red-800 underline hover:text-red-700"
          >
            CC BY 3.0
          </a>
          .
        </p>
      </aside>
    </section>
  )
}