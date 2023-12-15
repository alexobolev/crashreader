import { BaseStyles, ThemeProvider, Header, Octicon } from '@primer/react'
import { BugIcon } from '@primer/octicons-react'

import CRUpload from './components/CRUpload'
import init from 'wasm'


// Initialize our WebAssembly logic.
init()


function App() {
  return (
    <ThemeProvider>
      <BaseStyles>
        <Header>
          <Header.Item full>
            <Header.Link href="#" sx={{ fontSize: 2 }}>
              <Octicon icon={BugIcon} size={24} sx={{ mr: 3 }} />
              <span>CrashReader</span>
            </Header.Link>
          </Header.Item>
          <Header.Item sx={{ mr: 0 }}>
            <Header.Link href="https://github.com/alexobolev/crashreader" target='_blank'>
              <span>Contribute on GitHub</span>
            </Header.Link>
          </Header.Item>
        </Header>
        <CRUpload />
      </BaseStyles>
    </ThemeProvider>
  )
}

export default App
