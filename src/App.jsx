import { useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import FeatsPage from './pages/FeatsPage.jsx'
import ItemsPage from './pages/ItemsPage.jsx'
import CardMakerPage from './pages/CardMakerPage.jsx'
import LootGeneratorPage from './pages/LootGeneratorPage.jsx'
import BestiaryPage from './pages/BestiaryPage.jsx'
import DiceTray from './components/DiceTray.jsx'
import { ItemsProvider } from './context/ItemsContext.jsx'
import { InteractionProvider, useInteraction } from './context/InteractionContext.jsx'
import SpellsPage from './pages/SpellsPage.jsx'
import InitiativeTrackerPage from './pages/InitiativeTrackerPage.jsx'

// Clears any stacked spell/item preview when switching routes
function RouteInspectResetter() {
  const { pathname } = useLocation()
  const { clearInspect } = useInteraction()

  useEffect(() => {
    clearInspect()
  }, [pathname])

  return null
}

export default function App() {
  return (
    <InteractionProvider>
      <RouteInspectResetter />
      <div className="flex min-h-screen flex-col bg-stone-100 text-stone-900 print:bg-white">
        <Navbar />

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 print:max-w-none print:p-0">
          <ItemsProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/feats" element={<FeatsPage />} />
              <Route path="/items" element={<ItemsPage />} />
              <Route path="/card-maker" element={<CardMakerPage />} />
              <Route path="/loot-generator" element={<LootGeneratorPage />} />
              <Route path="/bestiary" element={<BestiaryPage />} />
              <Route
                path="*"
                element={
                  <p>
                    Page not found.{' '}
                    <Link to="/" className="text-red-800 underline">
                      Go home
                    </Link>
                  </p>
                }
              />
              <Route path="/spells" element={<SpellsPage/>} />
              <Route path="/initiative" element={<InitiativeTrackerPage/>} />
            </Routes>
          </ItemsProvider>
        </main>

        <Footer />
        <DiceTray />
      </div>
    </InteractionProvider>
  )
}