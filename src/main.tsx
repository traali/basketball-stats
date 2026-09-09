import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { registerBasketballWebMCP } from './mcp-app'

// Register WebMCP browser tools for AI agents (navigator.modelContext & document.modelContext)
registerBasketballWebMCP()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
