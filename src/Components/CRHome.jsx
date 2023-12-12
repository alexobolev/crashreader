import { PageLayout } from '@primer/react'
import { Blankslate } from '@primer/react/drafts'
import { BugIcon } from '@primer/octicons-react'

export default function CRHome() {
  return (
    <PageLayout containerWidth='medium'>
      <PageLayout.Content>
        <Blankslate>
          <Blankslate.Visual>
            <BugIcon size="medium" />
          </Blankslate.Visual>
          <Blankslate.Heading>Welcome to CrashReader!</Blankslate.Heading>
          <Blankslate.Description>
            CrashReader is a browser-side utility for generating interactive Win32 crash dump reports.
            It is geared towards working with crash dumps produced by Mass Effect Legendary Edition,
            but can probably used for other stuff as well!
          </Blankslate.Description>
          <Blankslate.PrimaryAction href='/upload'>
            Upload a .dmp file
          </Blankslate.PrimaryAction>
        </Blankslate>
      </PageLayout.Content>
    </PageLayout>
  )
}
