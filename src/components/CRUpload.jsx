import { useState } from 'react';

import { Checkbox, CheckboxGroup, FormControl, PageLayout, Text, UnderlineNav } from '@primer/react'
import { DataTable, PageHeader, Table } from '@primer/react/drafts'

import { asHex, getFilename } from '../utils/strings';
import { CRDefList } from './CRDefList';
import { wa_parse_crash } from 'wasm'


function CRInfoTabSummary({ crashInfo }) {
  if (crashInfo) {
    const processItems = crashInfo.metadata ? [
      { key: "Main Module", value: crashInfo.metadata.module_name },
      { key: "Base Address", value: asHex(crashInfo.metadata.module_base) },
      { key: "Process ID", value: crashInfo.metadata.process_id },
      { key: "Process Timestamp:", value: crashInfo.metadata.process_timestamp },
      { key: "Dump Timestamp:", value: crashInfo.metadata.dump_timestamp },
    ] : null;

    const executableItems = crashInfo.executable ? [
      { key: "Module Name", value: crashInfo.executable.name },
      { key: "Architecture", value: crashInfo.executable.is_64bit ? 'AMD64' : 'x86' },
      { key: "Image Base", value: asHex(crashInfo.executable.image_base) },
      { key: "Entry Point", value: asHex(crashInfo.executable.entry_point) },
    ] : null;

    const systemItems = crashInfo.system ? [
      { key: "OS Build", value: crashInfo.system.os_build },
      { key: "OS Version", value: crashInfo.system.os_version },
      { key: "CPU Info", value: crashInfo.system.cpu_ident },
      { key: "CPU Count", value: crashInfo.system.cpu_count },
      { key: "CPU Microcode", value: crashInfo.system.cpu_microcode },
    ] : null;

    const exceptionItems = crashInfo.exception ? [
      { key: "Reason", value: crashInfo.exception.reason },
      { key: "Address", value: asHex(crashInfo.exception.address) },
    ] : null;

    return (
      <>
        <div>
          <CRDefList title="Process metadata" items={processItems}/>
          <CRDefList title="Executable info" items={executableItems}/>
          <CRDefList title="System info" items={systemItems}/>
          <CRDefList title="Exception" items={exceptionItems}/>
        </div>
      </>
    )
  } else {
    return (<></>)
  }
}

function CRInfoTabCallstack({ crashInfo }) {
  const [trimFrames, setTrimFrames] = useState(true);
  const [trimFilenames, setTrimFilenames] = useState(true);

  const filename = trimFilenames ? getFilename : (path) => path

  // We can assume that the first thread is what crashed the program.
  const frameElements = crashInfo.threads[0].frames
    .map((frame, index) => { return { ...frame, local_index: index } })
    .filter(trimFrames ? (frame) => frame.resolved_rva !== undefined : (_) => true)
    .map((frame) => {
      const offsetElement = frame.resolved_rva ? asHex(frame.resolved_rva) : '???'
      const frameOpacity = frame.resolved_rva ? 1 : 0.7;

      const disasmElement = (frame.resolved_disasm)
        ? <div style={{
            display: 'block',
            margin: '0.5rem 1.5rem',
            padding: '0.5rem 0',
            lineHeight: '1.4',
            backgroundColor: '#f2f2f2',
          }}>
            {frame.resolved_disasm.map(function(tuple, index) {
              let background = 'default'
              if (index == 0) { background = 'lightyellow' }
              if (tuple[0] == frame.resolved_disasm_sel) { background = 'lightblue' }

              return (<code key={index} style={{
                display: 'block',
                padding: '0 0.5rem',
                backgroundColor: background,
              }}>{tuple[1]}</code>)
            })}
          </div>
        : <></>

      return (
        <div key={frame.local_index}>
          <code style={{ opacity: frameOpacity }}>
            <span style={{ display: 'inline-block', minWidth: '2rem' }}>{ frame.local_index }.</span>
            <strong>{ asHex(frame.resume_address) }</strong> ({ filename(frame.module_name) } + {offsetElement})
            {disasmElement}
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
          <FormControl.Label>Hide call frames not in the main module</FormControl.Label>
          <FormControl.Caption>Trim down the frame list to a comprehensible size.</FormControl.Caption>
        </FormControl>
        <FormControl>
          <Checkbox defaultChecked={trimFilenames} onChange={(e) => setTrimFilenames(e.target.checked)} />
          <FormControl.Label>Remove full module paths</FormControl.Label>
          <FormControl.Caption>Display short filenames for each module instead of full paths.</FormControl.Caption>
        </FormControl>
      </CheckboxGroup>
      <div className="frame-list">
        { frameElements }
      </div>
    </>
  )
}

function CRInfoTabThreads({ crashInfo }) {
  const data = crashInfo.threads
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

function CRInfoTabModules({ crashInfo }) {
  const data = crashInfo.modules.map((module) => {
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

function CRInfoTabs({ crashInfo }) {
  const [shownPage, setShownPage] = useState('summary')

  const pageTabs = [
    { id: 'summary', title: 'Summary', contents: <CRInfoTabSummary crashInfo={crashInfo} /> },
    { id: 'call-stack', title: 'Call stack', contents: <CRInfoTabCallstack crashInfo={crashInfo} /> },
    { id: 'threads', title: 'All threads', contents: <CRInfoTabThreads crashInfo={crashInfo} /> },
    { id: 'modules', title: 'Modules', contents: <CRInfoTabModules crashInfo={crashInfo} /> },
  ]

  const pageTabElems = pageTabs.map(function (tab) {
    const extra = tab.id === shownPage ? { ["aria-current"]: "page" } : []
    return <UnderlineNav.Item key={tab.id} onSelect={() => setShownPage(tab.id)} {...extra}>{tab.title}</UnderlineNav.Item>
  })
  const pageTabContent = pageTabs.find((tab) => tab.id === shownPage).contents

  return (
    <div hidden={crashInfo == null}>
      <UnderlineNav aria-label="main">{ pageTabElems }</UnderlineNav>
      <PageLayout containerWidth='full'>
        <PageLayout.Content>{ pageTabContent }</PageLayout.Content>
      </PageLayout>
    </div>
  )
}

export default function CRUpload() {
  const [crashBlob, setCrashBlob] = useState(null)
  const [crashInfo, setCrashInfo] = useState(null)
  const [exeBlob, setExeBlob] = useState(null)

  const updateCrashInfo = (crashBuffer, exeBuffer) => {
    if (crashBuffer !== null && exeBuffer !== null) {
      const parsed = wa_parse_crash(crashBuffer, exeBuffer)
      setCrashInfo(parsed)
      console.log(parsed)
    }
  }

  const handleCrashFileStart = (ec) => {
    if (ec.target.files) {
      const file = ec.target.files[0]
      const reader = new FileReader()
      reader.onload = (ev) => {
        const buffer = new Uint8Array(ev.target.result)
        setCrashBlob(buffer)
        updateCrashInfo(buffer, exeBlob)
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const handleExeFileStart = (ec) => {
    if (ec.target.files) {
      const file = ec.target.files[0]
      const reader = new FileReader()
      reader.onload = (ev) => {
        const buffer = new Uint8Array(ev.target.result)
        setExeBlob(buffer)
        updateCrashInfo(crashBlob, buffer)
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
          <div style={{ display: 'flex', flexDirection: 'row', columnGap: '2rem' }}>
            <FormControl required={true}>
              <FormControl.Label>Crash dump</FormControl.Label>
              <FormControl.Caption>The crash <code>.dmp</code> file in <code>minidump</code> format.</FormControl.Caption>
              <input type='file' onChange={handleCrashFileStart} accept='.dmp'/>
            </FormControl>
            <FormControl required={true}>
              <FormControl.Label>Application binary</FormControl.Label>
              <FormControl.Caption>Non-DRM-encumbered <code>.exe</code> file to enrich and filter output.</FormControl.Caption>
              <input type='file' onChange={handleExeFileStart} accept='.exe' />
            </FormControl>
          </div>
        </PageLayout.Content>
      </PageLayout>
      <CRInfoTabs crashInfo={crashInfo} />
    </>
  )
}
