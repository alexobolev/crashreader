import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { BaseStyles, ThemeProvider, Header, Octicon } from '@primer/react'
import { BugIcon } from '@primer/octicons-react'

import CRHome from './Components/CRHome'
import CRUpload from './Components/CRUpload'
import './App.css'


const router = createBrowserRouter([
  { path: "/", element: <CRHome /> },
  { path: "/upload", element: <CRUpload /> },
]);

function App() {
  return (
    <ThemeProvider>
      <BaseStyles>
        <Header>
          <Header.Item>
            <Header.Link href="/" sx={{ fontSize: 2 }}>
              <Octicon icon={BugIcon} size={24} sx={{ mr: 2 }} />
              <span>CrashReader</span>
            </Header.Link>
          </Header.Item>
          <Header.Item full>by Alex Sobolev</Header.Item>
          <Header.Item sx={{ mr: 0 }}>
            <Header.Link href="https://github.com/alexobolev/crashreader">
              <span>Contribute on GitHub</span>
            </Header.Link>
          </Header.Item>
        </Header>
        <RouterProvider router={router} />
      </BaseStyles>
    </ThemeProvider>
  )
}

export default App
