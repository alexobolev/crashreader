export function CRDefList({ title, items }) {
  if (items != null) {
    const itemElems = items.map((item) => {
      return (
        <div key={item.key} style={{ display: 'flex' }}>
          <dt style={{ flex: '0 1 160px', fontWeight: 600, color: 'rgb(31, 35, 40)' }}>
            {item.key}
          </dt>
          <dd style={{ flex: '1 1 auto' }}>
            <code>{item.value ? item.value : '???'}</code>
          </dd>
        </div>
      )
    })

    return (
      <>
        <p style={{ display: 'block', fontWeight: 'bold' }}>&sect; {title}</p>
        <dl style={{ fontSize: '14px' }}>{itemElems}</dl>
      </>
    )
  } else {
    return (
      <p style={{ display: 'block', fontWeight: 'bold' }}>&sect; {title} - missing</p>
    )
  }
}
