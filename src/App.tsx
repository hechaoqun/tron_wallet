import './config/appkit'
import PayPage from './components/PayPage'
import DeepLinkTest from './components/DeepLinkTest'
import './App.css'

function App() {
  const path = window.location.pathname
  if (path === '/deeplink-test') {
    return <DeepLinkTest />
  }
  return <PayPage />
}

export default App
