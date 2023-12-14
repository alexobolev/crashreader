/**
 * Unused for now, idk how to make @primer/dialog actually render.
 */

import { Dialog } from "@primer/react"

export default function CRAboutDialog({ onClose, width, height }) {
  return (
    <Dialog
      title="Welcome to CrashReader!"
      onDismiss={onClose}
      width={width}
      height={height}
      footerButtons={[
        {
          buttonType: 'primary',
          content: 'Okay',
          onClick: onClose,
          autofocus: true,
        }
      ]}
    >
      <span>
        CrashReader is a browser-side utility for generating interactive Win32 crash dump reports.
        It is geared towards working with crash dumps produced by Mass Effect Legendary Edition,
        but can probably used for other stuff as well!
      </span>
    </Dialog>
  )
}
