# 5e WikiBank

A fast, dark-mode-ready digital reference and tabletop utility for **Dungeons & Dragons 5th Edition**. Browse, search, and filter feats, magic items, spells, and monsters; build persistent encounter rosters, spellbooks, feat loadouts, and inventories with JSON import/export; track combat in the Initiative Tracker; roll dice directly from inline hyperlinks; generate random treasure hoards; and print duplex-ready A4 reference cards.

Built with **React (Vite), React Router, Tailwind CSS** and a small **Node/Express** API.

- **Live site:** https://5e-wikibank.vercel.app
- **Live API:**  https://fivee-wikibank.onrender.com/api / feats, items ...
- **Repository:** https://github.com/InextinguishableFire/5e-wikibank

---

## Data Sources

The project uses two APIs:

1. **Public online API: [D&D 5e SRD API](https://www.dnd5eapi.co)**
   Provides open-licensed SRD data: Bestiary monster list and stat blocks, challenge-rating filtering, and a fallback spell lookup.
2. **My own local REST API (Express, in `server/`)**
   Serves **Feats**, **Items**, and **Spells** from local 5etools-formatted JSON files (`server/data/feats.json`, `items.json`, `sources.json`, and `spells/*.json`). The raw data contains deeply nested entries, `_copy` inheritance templates, structured prerequisites, and inline markup tags (such as `{@dice 1d4}` or `{@spell misty step}`), so the server normalizes every entry into a clean, consistent shape at startup before serving it to the React client. Source codes are translated to full book names using `sources.json`.

The local data files are included for coursework only.

---

## Features

- **Compendiums with centralized filtering:** instant search and multi-category pill filters (`CatalogFilterPanel` + `useCatalogFilters`) across **Feats** (Source, Category, Ability Score Increase, Prerequisite), **Items** (Source, Type, Rarity, Attunement), **Spells** (Source, Level, School, Concentration, Casting Requirement, Casting Time) and **Bestiary** (Source, Challenge Rating, Creature Type, Size, Artwork), with a live side-panel preview.
- **List builders (Feat Loadout, Spellbook, Item Inventory, Encounter Builder):** persistent tables (`useRosterBuilder` + `RosterTable`) saved in `localStorage`, with schema-validated `.json` export and import. Inventory totals weight; encounters total XP.
- **Cross-tool bridges:** "Send to Card Maker" exports a loadout, spellbook or inventory into the Card Maker; "Send to Initiative" expands an encounter into numbered combatants (`Goblin 1`, `Goblin 2`) with AC and HP filled in.
- **Initiative Tracker:** turn order, round counter, active-turn highlight, HP tracking and custom entries, saved in `localStorage`.
- **Interactive text:** dice formulas (`2d8+4`) and cross-referenced spells/items become buttons. Dice roll in the tray; spells and items open in the side panel with a **← Back** button.
- **Floating dice tray** on every page: `1d20`, custom `NdM+X` expressions, per-die breakdown and roll history.
- **Duplex A4 Card Maker:** printable 3×3 card sheets for Feats, Items and Spells with automatic overflow onto the card back and mirrored back pages.
- **Loot Generator:** treasure hoards and individual loot filtered by active sources.
- **Light and dark themes** with print-safe styles.

---

## Running Locally

Requires **Node.js 18 or newer**. Use two terminals.

```bash
# Terminal 1: API on http://localhost:3001
cd server
npm install
npm run dev
```

```bash
# Terminal 2: React app (from the project root)
npm install
npm run dev
```

Then open the address Vite prints (usually `http://localhost:5173`). The server prints how many feats, items and spells it loaded when it starts.

### API endpoints

- `http://localhost:3001/api/feats`
- `http://localhost:3001/api/items`
- `http://localhost:3001/api/spells`

Each also accepts `?search=text` and `?source=CODE`, and `/:id` returns a single entry. The React app reads the API address from the `VITE_API_URL` environment variable and falls back to `http://localhost:3001/api`.

---

## Project Structure

```text
├── public/                 # Static SVG icons and favicon
├── server/                 # Express REST API
│   ├── data/               # feats.json, items.json, sources.json, spells/*.json
│   └── lib/                # Data normalization and tag parsers
└── src/
    ├── components/         # Navbar, DiceTray, RichText, preview panels, filters
    ├── context/            # InteractionContext (dice trigger, quick-inspect stack)
    ├── hooks/              # Reusable hooks (data fetching, filters, roster builder)
    ├── pages/              # Home, Feats, Items, Spells, Bestiary, Card Maker, Loot, Initiative
    ├── services/           # API client functions
    └── utils/              # Filter and source helpers
```

---

## Disclaimer & Attribution

- **Disclaimer:** This site is intended as an easily accessible digital reference for products you already own. Please ensure you only access content in accordance with your local laws.
- **Icons:** UI and card icons by [Delapouite](https://game-icons.net/), licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
