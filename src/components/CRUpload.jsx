import { useState } from 'react';

import { Checkbox, CheckboxGroup, FormControl, PageLayout, Text, UnderlineNav } from '@primer/react'
import { DataTable, PageHeader, Table } from '@primer/react/drafts'

import { asHex, getFilename } from '../utils/strings';
import { CRDefList } from './CRDefList';
import { wa_parse_crash } from 'wasm'


function CRInfoTabSummary({ fileContents }) {
  if (fileContents) {
    const processItems = fileContents.metadata ? [
      { key: "Process ID", value: fileContents.metadata.process_id },
      { key: "Process Timestamp:", value: fileContents.metadata.process_timestamp },
      { key: "Dump Timestamp:", value: fileContents.metadata.dump_timestamp },
    ] : null;

    const systemItems = fileContents.system ? [
      { key: "OS Build", value: fileContents.system.os_build },
      { key: "OS Version", value: fileContents.system.os_version },
      { key: "CPU Info", value: fileContents.system.cpu_ident },
      { key: "CPU Count", value: fileContents.system.cpu_count },
      { key: "CPU Microcode", value: fileContents.system.cpu_microcode },
    ] : null;

    const exceptionItems = fileContents.exception ? [
      { key: "Reason", value: fileContents.exception.reason },
      { key: "Address", value: asHex(fileContents.exception.address) },
    ] : null;

    return (
      <>
        <div>
          <CRDefList title="Process metadata" items={processItems}/>
          <CRDefList title="System info" items={systemItems}/>
          <CRDefList title="Exception" items={exceptionItems}/>
        </div>
      </>
    )
  } else {
    return (<></>)
  }
}

function CRInfoTabCallstack({ fileContents }) {
  const [trimFrames, setTrimFrames] = useState(true);
  const [trimFilenames, setTrimFilenames] = useState(true);
  const [showDisassembly, setShowDisassembly] = useState(false);

  const filename = trimFilenames ? getFilename : (path) => path

  // We can assume that the first thread is what crashed the program.
  const frameElements = fileContents.threads[0].frames
    .map((frame, index) => { return { ...frame, local_index: index } })
    .filter(trimFrames ? (frame) => !frame.module_name.includes("Windows\\System32") : (_) => true)
    .map((frame) => {
      return (
        <div key={frame.local_index}>
          <code>
            <span style={{ display: 'inline-block', minWidth: '2rem' }}>{ frame.local_index }.</span>
            <strong>{ asHex(frame.instruction) }</strong> ({ filename(frame.module_name) })
          </code>
        </div>
      )
    })

  return (
    <>
      <CheckboxGroup sx={{ mb: 4 }}>
        <CheckboxGroup.Label>Display options</CheckboxGroup.Label>
        <FormControl>
          <Checkbox defaultChecked={trimFrames} onChange={(e) => setTrimFrames(e.target.checked)} />
          <FormControl.Label>Hide system stack frames</FormControl.Label>
          <FormControl.Caption>Trim down the frame list to a comprehensible size.</FormControl.Caption>
        </FormControl>
        <FormControl>
          <Checkbox defaultChecked={trimFilenames} onChange={(e) => setTrimFilenames(e.target.checked)} />
          <FormControl.Label>Remove full module paths</FormControl.Label>
          <FormControl.Caption>Display short filenames for each module instead of full paths.</FormControl.Caption>
        </FormControl>
        <FormControl disabled>
          <Checkbox defaultChecked={showDisassembly} onChange={(e) => setShowDisassembly(e.target.checked)} />
          <FormControl.Label>Display local assembly</FormControl.Label>
          <FormControl.Caption>Attempt to disassemble a few bytes at each frame of the main module.</FormControl.Caption>
        </FormControl>
      </CheckboxGroup>
      <div className="frame-list">
        { frameElements }
      </div>
    </>
  )
}

function CRInfoTabThreads({ fileContents }) {
  const data = fileContents.threads
  const columns = [
    {
      header: 'ID',
      field: 'id',
      rowHeader: true,
    },
    {
      header: 'Name',
      field: 'name',
      renderCell: (row) => <span>{ row.name ? row.name : '-' }</span>,
    },
    {
      header: 'Frame count',
      field: 'frames',
      renderCell: (row) => <span>{ row.frames.length }</span>,
    },
  ]

  return (
    <>
      <Table.Container>
        <Table.Title as="h4">Running threads</Table.Title>
        <Table.Subtitle as="p">All threads which were executed or suspended by the application at the time of its crash.</Table.Subtitle>
        <DataTable data={data} columns={columns}/>
      </Table.Container>
    </>
  )
}

function CRInfoTabModules({ fileContents }) {
  const data = fileContents.modules.map((module) => {
    return { ...module, id: module.name }
  })
  const columns = [
    {
      header: 'Path',
      field: 'name',
      rowHeader: true,
    },
    {
      header: 'Image base',
      field: 'image_base',
      maxWidth: '140px',
      renderCell: (row) => <code>{ asHex(row.image_base) }</code>,
    },
    {
      header: 'Image size',
      field: 'image_size',
      maxWidth: '140px',
      renderCell: (row) => <code>{ asHex(row.image_size) }</code>,
    }
  ]

  return (
    <>
      <Table.Container>
        <Table.Title as="h4">Loaded modules</Table.Title>
        <Table.Subtitle as="p">Executables and dynamic libraries loaded into the crashed process.</Table.Subtitle>
        <DataTable data={data} columns={columns}/>
      </Table.Container>
    </>
  )
}

function CRInfoTabs({ fileContents }) {
  const [shownPage, setShownPage] = useState('summary')

  const pageTabs = [
    { id: 'summary', title: 'Summary', contents: <CRInfoTabSummary fileContents={fileContents} /> },
    { id: 'call-stack', title: 'Call stack', contents: <CRInfoTabCallstack fileContents={fileContents} /> },
    { id: 'threads', title: 'All threads', contents: <CRInfoTabThreads fileContents={fileContents} /> },
    { id: 'modules', title: 'Modules', contents: <CRInfoTabModules fileContents={fileContents} /> },
  ]

  const pageTabElems = pageTabs.map(function (tab) {
    const extra = tab.id === shownPage ? { ["aria-current"]: "page" } : []
    return <UnderlineNav.Item key={tab.id} onSelect={() => setShownPage(tab.id)} {...extra}>{tab.title}</UnderlineNav.Item>
  })
  const pageTabContent = pageTabs.find((tab) => tab.id === shownPage).contents

  return (
    <div hidden={fileContents == null}>
      <UnderlineNav aria-label="main">{ pageTabElems }</UnderlineNav>
      <PageLayout containerWidth='full'>
        <PageLayout.Content>{ pageTabContent }</PageLayout.Content>
      </PageLayout>
    </div>
  )
}

export default function CRUpload() {
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
          <div style={{ display: 'flex', flexDirection: 'row', columnGap: '4rem' }}>
            <FormControl required={true}>
              <FormControl.Label>Crash dump</FormControl.Label>
              <FormControl.Caption>This file must have <code>.dmp</code> extension and be in <code>minidump</code> format.</FormControl.Caption>
              <input type='file' onChange={handleFileStart} accept='.dmp'/>
              {/* <FormControl.Validation variant='success'>A-okay!</FormControl.Validation> */}
              {/* <FormControl.Validation variant='error'>Not a valid dump file.</FormControl.Validation> */}
            </FormControl>
            <FormControl>
              <FormControl.Label>Application binary (optional)</FormControl.Label>
              <FormControl.Caption>Optional <code>.exe</code> file to enrich output with assembly instructions.</FormControl.Caption>
              <input type='file' onChange={handleFileStart} accept='.exe'/>
            </FormControl>
          </div>
        </PageLayout.Content>
      </PageLayout>
      <CRInfoTabs fileContents={fileContents} />
    </>
  )
}
