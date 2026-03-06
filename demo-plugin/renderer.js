// Demo external plugin — CommonJS factory receiving a host API
// Components use React.createElement directly (no JSX compilation)

module.exports = function (host) {
  var React = host.React
  var useState = host.useState
  var useEffect = host.useEffect
  var useCallback = host.useCallback
  var useRef = host.useRef
  var FONT_MONO = host.FONT_MONO
  var TYPE = host.TYPE
  var SPACE = host.SPACE
  var panelHeaderStyle = host.panelHeaderStyle
  var btnReset = host.btnReset

  // --- Cross-component communication ---
  var dialogListeners = []
  var dialogOpen = false

  function openDialog() {
    dialogOpen = true
    for (var i = 0; i < dialogListeners.length; i++) {
      dialogListeners[i](true)
    }
  }

  function closeDialog() {
    dialogOpen = false
    for (var i = 0; i < dialogListeners.length; i++) {
      dialogListeners[i](false)
    }
  }

  // --- PanelComponent: collapsible sidebar panel ---
  function PanelComponent() {
    var collapseState = useState(false)
    var collapsed = collapseState[0]
    var setCollapsed = collapseState[1]

    var numState = useState(function () { return Math.floor(Math.random() * 1000) })
    var num = numState[0]
    var setNum = numState[1]

    var regenerate = useCallback(function () {
      setNum(Math.floor(Math.random() * 1000))
    }, [])

    return React.createElement('div', {
      style: {
        flexShrink: 0,
        fontFamily: FONT_MONO,
        fontSize: TYPE.body,
        color: 'var(--text-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
      },
    },
      React.createElement('div', {
        onClick: function () { setCollapsed(!collapsed) },
        style: Object.assign({}, panelHeaderStyle, {
          borderBottom: collapsed ? 'none' : '1px solid var(--border-subtle)',
        }),
      },
        React.createElement('span', {
          style: { fontSize: 9, color: 'var(--text-faintest)' },
        }, collapsed ? '\u25B6' : '\u25BC'),
        'Demo Plugin'
      ),
      !collapsed && React.createElement('div', {
        style: { padding: '6px 12px' },
      },
        React.createElement('div', {
          style: { marginBottom: SPACE.sm, color: 'var(--text-dim)', fontSize: TYPE.sm },
        }, 'Random number: ' + num),
        React.createElement('button', {
          onClick: regenerate,
          style: Object.assign({}, btnReset, {
            fontSize: TYPE.sm,
            color: 'var(--accent)',
            padding: '2px 0',
          }),
        }, 'Regenerate')
      )
    )
  }

  // --- MenuBarComponent: star button in terminal title bar ---
  function MenuBarComponent() {
    return React.createElement('button', {
      onClick: function (e) {
        e.stopPropagation()
        openDialog()
      },
      title: 'Open demo dialog',
      style: Object.assign({}, btnReset, {
        color: 'var(--text-faintest)',
        fontSize: TYPE.lg,
        padding: SPACE.xxs + 'px ' + SPACE.xs + 'px',
        borderRadius: 4,
        flexShrink: 0,
        WebkitAppRegion: 'no-drag',
        transition: 'color 0.1s',
      }),
      onMouseEnter: function (e) { e.currentTarget.style.color = 'var(--text-dim)' },
      onMouseLeave: function (e) { e.currentTarget.style.color = 'var(--text-faintest)' },
    }, '\u2605')
  }

  // --- OverlayComponent: modal dialog ---
  function OverlayComponent() {
    var openState = useState(dialogOpen)
    var isOpen = openState[0]
    var setIsOpen = openState[1]

    var numState = useState(function () { return Math.floor(Math.random() * 1000) })
    var num = numState[0]

    useEffect(function () {
      dialogListeners.push(setIsOpen)
      return function () {
        var idx = dialogListeners.indexOf(setIsOpen)
        if (idx >= 0) dialogListeners.splice(idx, 1)
      }
    }, [])

    if (!isOpen) return null

    return React.createElement('div', {
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'var(--overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      onMouseDown: function (e) {
        if (e.target === e.currentTarget) closeDialog()
      },
    },
      React.createElement('div', {
        style: {
          width: 400,
          background: 'var(--surface)',
          borderRadius: 8,
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px var(--shadow)',
          padding: '20px 24px',
          fontFamily: FONT_MONO,
        },
        onMouseDown: function (e) { e.stopPropagation() },
      },
        React.createElement('div', {
          style: {
            fontSize: TYPE.md,
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: SPACE.sm,
          },
        }, 'Demo Dialog'),
        React.createElement('div', {
          style: {
            fontSize: TYPE.body,
            color: 'var(--text-dim)',
            marginBottom: SPACE.lg,
            lineHeight: 1.5,
          },
        }, 'This is a demo overlay from an external plugin. Random number: ' + num),
        React.createElement('button', {
          onClick: function () { closeDialog() },
          style: {
            background: 'var(--accent)',
            border: 'none',
            borderRadius: 4,
            color: '#fff',
            cursor: 'pointer',
            fontFamily: FONT_MONO,
            fontSize: TYPE.body,
            padding: '6px 16px',
          },
        }, 'Close')
      )
    )
  }

  return {
    PanelComponent: PanelComponent,
    MenuBarComponent: MenuBarComponent,
    OverlayComponent: OverlayComponent,
  }
}
