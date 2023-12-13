import { useState } from 'react';

import { FormControl, PageLayout, Text, UnderlineNav } from '@primer/react'
import { PageHeader } from '@primer/react/drafts'

import init, { wa_parse_crash } from 'wasm'


init()


function CRIntoTabSummary({fileInfo}) {
  return (
    <>
      Hello there!
    </>
  )
}

function CRInfoTabs({ fileInfo, fileContents }) {
  const [shownPage, setShownPage] = useState('summary')

  const pageTabs = [
    { id: 'summary', title: 'Summary', renderContents: <CRIntoTabSummary fileInfo={fileInfo} /> },
    { id: 'call-stack', title: 'Call stack' },
    { id: 'threads', title: 'Thread info' },
  ];

  const pageTabElems = pageTabs.map(function (tab) {
    const extraProps = [];
    if (tab.id === shownPage) {
      extraProps["aria-current"] = "page";
    }
    const onSelect = () => setShownPage(tab.id);
    return <UnderlineNav.Item key={tab.id} onSelect={onSelect} {...extraProps}>{tab.title}</UnderlineNav.Item>
  })

  return (
    <div hidden={fileInfo == null && fileContents == null}>
      <UnderlineNav aria-label="main">{ pageTabElems }</UnderlineNav>
      <PageLayout containerWidth='full'>
        <PageLayout.Content>{ pageTabs.find((tab) => tab.id === shownPage).renderContents }</PageLayout.Content>
      </PageLayout>
    </div>
  )
}

export default function CRUpload() {
  const [fileInfo, setFileInfo] = useState(null)
  const [fileContents, setFileContents] = useState(null)

  const handleFileStart = (ec) => {
    if (ec.target.files) {
      const file = ec.target.files[0]
      const reader = new FileReader()
      reader.onload = (ev) => {
        const buffer = new Uint8Array(ev.target.result)
        const parsed = wa_parse_crash(buffer)
        setFileContents(parsed)
        console.log(parsed)
      }

      setFileInfo(file)
      reader.readAsArrayBuffer(file)
    }
  }

  return (
    <>
      <PageLayout containerWidth='full'>
        <PageLayout.Header divider='line'>
          <PageHeader>
            <PageHeader.TitleArea>
              <PageHeader.Title>Crashdump upload</PageHeader.Title>
            </PageHeader.TitleArea>
            <PageHeader.Description>
              <Text>Upload a .dmp file generated by the operating system.</Text>
            </PageHeader.Description>
          </PageHeader>
        </PageLayout.Header>
        <PageLayout.Content>
          <FormControl required={true}>
            <FormControl.Label>Input file</FormControl.Label>
            <FormControl.Caption>This must have .dmp extension and might be quite big</FormControl.Caption>
            <input type='file' onChange={handleFileStart}/>
            {/* <FormControl.Validation variant='success'>A-okay!</FormControl.Validation> */}
            {/* <FormControl.Validation variant='error'>Not a valid dump file.</FormControl.Validation> */}
          </FormControl>
        </PageLayout.Content>
      </PageLayout>
      <CRInfoTabs fileInfo={fileInfo} fileContents={fileContents} />
    </>
  )
}
