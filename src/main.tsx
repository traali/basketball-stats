import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { registerBasketballWebMCP } from './mcp-app'

const ready = registerBasketballWebMCP()
if (typeof window !== 'undefined') {
  window.__WEBMCP_READY__ = ready
  window.addEventListener('pageshow', () => {
    void registerBasketballWebMCP()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
