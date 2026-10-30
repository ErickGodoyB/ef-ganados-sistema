/**
 * Setup de Vitest (ver vite.config.js, campo "test"): agrega los matchers de
 * jest-dom (toBeInTheDocument, toHaveAttribute, etc.) a expect, una sola vez
 * para toda la corrida.
 */

import '@testing-library/jest-dom'
