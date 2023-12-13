import { useState } from 'react';

import { Checkbox, CheckboxGroup, FormControl, PageLayout, Text, UnderlineNav } from '@primer/react'
import { DataTable, PageHeader, Table } from '@primer/react/drafts'

import './CRUpload.css'
import init, { wa_parse_crash } from 'wasm'


init()


function asHex(number) {
  return '0x' + number.toString(16);
}

function CRDefList({ title, items }) {
  if (items != null) {
    const itemElems = items.map((item) => {
      return (
        <div key={item.key} className="info-list-row">
          <dt>{item.key}</dt>
          <dd><code>{item.value ? item.value : '???'}</code></dd>
        </div>
      )
    })
    return (
      <>
        <p className="info-list-title">&sect; {title}</p>
        <dl className="info-list">
          { itemElems }
        </dl>
      </>
    )
  } else {
    <p className="info-list-title">&sect; {title} - missing</p>
  }
}

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
  const firstThread = fileContents.threads[0];

  const [trimFrames, setTrimFrames] = useState(true);
  const [trimFilenames, setTrimFilenames] = useState(true);
  const [showDisassembly, setShowDisassembly] = useState(false);

  const frameFilter = trimFrames
    ? (frame) => !frame.module_name.includes("Windows\\System32")
    : (_) => true
  const nameFilter = trimFilenames
    ? (path) => path.split('\\').pop().split('/').pop()
    : (path) => path

  const indexedFrames = firstThread.frames.map((frame, index) => {
    frame.local_index = index
    return frame
  })
  const frameElements = indexedFrames.filter(frameFilter).map((frameInfo) => {
    return (
      <div key={frameInfo.local_index} style={{ marginBottom: '0.1rem' }}>
        <code>
          <span className="frame-id">{ frameInfo.local_index }.</span> <strong>{ asHex(frameInfo.instruction) }</strong> in { nameFilter(frameInfo.module_name) }
        </code>
      </div>
    )
  })

  return (
    <>
      <CheckboxGroup sx={{ mb: 3 }}>
        <CheckboxGroup.Label>Main stack frames' display options</CheckboxGroup.Label>
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
    module.id = module.name
    return module
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
    { id: 'summary', title: 'Summary', renderContents: <CRInfoTabSummary fileContents={fileContents} /> },
    { id: 'call-stack', title: 'Call stack', renderContents: <CRInfoTabCallstack fileContents={fileContents} /> },
    { id: 'threads', title: 'All threads', renderContents: <CRInfoTabThreads fileContents={fileContents} /> },
    { id: 'modules', title: 'Modules', renderContents: <CRInfoTabModules fileContents={fileContents} /> },
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
    <div hidden={fileContents == null}>
      <UnderlineNav aria-label="main">{ pageTabElems }</UnderlineNav>
      <PageLayout containerWidth='full'>
        <PageLayout.Content>{ pageTabs.find((tab) => tab.id === shownPage).renderContents }</PageLayout.Content>
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
