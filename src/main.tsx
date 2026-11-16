import { SettingsProvider } from './app/SettingsContext'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './styles/globals.css'
createRoot(document.getElementById('root')!).render(<SettingsProvider><App/></SettingsProvider>)
