import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerPwaServiceWorker } from './utils/pwaRegistration.js'
import { initializeThemeMode } from './utils/themeMode.js'
import { I18nProvider } from './i18n/I18nProvider.jsx'

initializeThemeMode()
registerPwaServiceWorker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
