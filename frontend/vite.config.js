import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Config de Vitest (npm test): entorno jsdom (simula el DOM del
  // navegador, necesario para montar componentes React) y el setup de
  // jest-dom (ver src/test/setupTests.js). La API se simula en cada test
  // (ver src/api/__mocks__ o los mocks puntuales de cada archivo): nunca se
  // llama al servidor real.
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.js',
    pool: 'threads',
    fileParallelism: false,
    // jest-dom (ver setupTests.js) agrega sus matchers llamando a
    // expect.extend sobre un "expect" global: cada test de todos modos
    // importa describe/it/expect de forma explícita (ver la convención del
    // resto de los *.test.js/jsx), así que esto no cambia cómo se escriben.
    globals: true,
  },
})
