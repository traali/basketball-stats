import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { WebMcpTools } from './components/WebMcpTools'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WebMcpTools />
    <App />
  </StrictMode>,
)
