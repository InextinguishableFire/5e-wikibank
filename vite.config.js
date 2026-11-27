import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tailwind v4 runs as a Vite plugin, so there is no tailwind.config.js to maintain.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
