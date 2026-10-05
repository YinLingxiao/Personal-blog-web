import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import './styles/site.css'
import './styles/reading.css'
import App from './App'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')
const router = createBrowserRouter([{ path: '*', element: <App /> }], { basename })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
