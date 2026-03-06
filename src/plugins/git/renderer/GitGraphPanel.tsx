import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '../../../renderer/store/useAppStore'
import { FONT_MONO, TYPE, RADIUS, SPACE, badge, emptyState, panelTitleStyle } from '../../../renderer/designTokens'
import type { GitPluginSettings } from '../../../shared/types'
import { useGitAvailability } from './useGitAvailability'

const LANE_COLORS = ['var(--lane-1)','var(--lane-2)','var(--lane-3)','var(--lane-4)','var(--lane-5)','var(--lane-6)','var(--lane-7)','var(--lane-8)']
const LANE_W = 14
const ROW_H = 20

type CommitData = {
  hash: string; shortHash: string; parents: string[]; refs: string[];
  subject: string; author: string; relativeTime: string
}

type GraphData = {
  commits: CommitData[]
  branch: string
  dirty: boolean
  ahead: number
  files: string[]
  headFiles: Array<{ status: string; file: string }>
} | null

type CellType = 'empty' | 'through' | 'nodeHere' | 'mergeFrom' | 'branchTo'

interface GraphCell {
  type: CellType
  color: string
  targetLane?: number
}

interface GraphRow {
  commit: CommitData
  lane: number
  color: string
  cells: GraphCell[]
}

function computeGraphRows(commits: CommitData[]): GraphRow[] {
  const activeLanes: (string | null)[] = []
  const rows: GraphRow[] = []

  const getOrAssignLane = (hash: string): number => {
    const idx = activeLanes.indexOf(hash)
    if (idx !== -1) return idx
    const empty = activeLanes.indexOf(null)
    if (empty !== -1) { activeLanes[empty] = hash; return empty }
    activeLanes.push(hash)
    return activeLanes.length - 1
  }

  for (const commit of commits) {
    const myLane = getOrAssignLane(commit.hash)
    const color = LANE_COLORS[myLane % LANE_COLORS.length]

    const numLanes = Math.max(activeLanes.length, 1)
    const cells: GraphCell[] = Array.from({ length: numLanes }, (_, i) => ({
      type: 'empty' as CellType,
      color: LANE_COLORS[i % LANE_COLORS.length],
    }))

    for (let i = 0; i < activeLanes.length; i++) {
      if (activeLanes[i] !== null && i !== myLane) {
        cells[i] = { type: 'through', color: LANE_COLORS[i % LANE_COLORS.length] }
      }
    }

    cells[myLane] = { type: 'nodeHere', color }

    if (commit.parents.length > 0) {
      activeLanes[myLane] = commit.parents[0]
    } else {
      activeLanes[myLane] = null
    }

    for (let p = 1; p < commit.parents.length; p++) {
      const parentHash = commit.parents[p]
      const existingLane = activeLanes.indexOf(parentHash)
      if (existingLane !== -1) {
        cells[existingLane] = { type: 'mergeFrom', color, targetLane: myLane }
      } else {
        const newLane = getOrAssignLane(parentHash)
        activeLanes[newLane] = parentHash
        if (newLane >= cells.length) {
          cells.push({ type: 'branchTo', color, targetLane: myLane })
        } else {
          cells[newLane] = { type: 'branchTo', color, targetLane: myLane }
        }
      }
    }

    while (activeLanes.length > 0 && activeLanes[activeLanes.length - 1] === null) {
      activeLanes.pop()
    }

    rows.push({ commit, lane: myLane, color, cells })
  }

  return rows
}

interface FileLine { label: string; color: string }

function parseLines(files: string[]): { staged: FileLine[]; unstaged: FileLine[]; untracked: FileLine[] } {
  const staged: FileLine[] = []
  const unstaged: FileLine[] = []
  const untracked: FileLine[] = []
  const statusColor: Record<string, string> = {
    M: 'var(--git-modified)', A: 'var(--git-added)', D: 'var(--git-deleted)', R: 'var(--git-renamed)', C: 'var(--git-renamed)', U: 'var(--status-dirty)',
  }
  for (const line of files) {
    if (line.length < 3) continue
    const x = line[0], y = line[1], file = line.slice(3)
    if (x === '?' && y === '?') { untracked.push({ label: file, color: 'var(--git-untracked)' }); continue }
    if (x !== ' ') staged.push({ label: `${x} ${file}`, color: statusColor[x] ?? 'var(--text-muted)' })
    if (y !== ' ') unstaged.push({ label: `${y} ${file}`, color: statusColor[y] ?? 'var(--text-muted)' })
  }
  return { staged, unstaged, untracked }
}

function RefBadge({ name }: { name: string }) {
  const refStr = name
  let bg = 'var(--ref-default)'
  let label = refStr
  if (refStr.startsWith('HEAD ->')) {
    bg = 'var(--ref-head)'
    label = refStr.replace('HEAD -> ', '')
  } else if (refStr === 'HEAD') {
    bg = 'var(--ref-detached)'
  } else if (refStr.startsWith('tag:')) {
    bg = 'var(--ref-tag)'
    label = refStr.replace('tag: ', '')
  } else if (refStr.startsWith('origin/')) {
    bg = 'var(--ref-remote)'
  }
  return (
    <span style={{
      ...badge,
      background: bg,
      color: 'var(--text-secondary)',
      marginRight: RADIUS.sm,
    }}>
      {label}
    </span>
  )
}

function GraphSvg({ cells, rowH, maxLanes }: { cells: GraphCell[]; rowH: number; maxLanes: number }) {
  const visibleCells = cells.slice(0, maxLanes)
  const svgW = Math.max(visibleCells.length * LANE_W, LANE_W)

  const elems: React.ReactNode[] = []
  const cx = (lane: number) => lane * LANE_W + LANE_W / 2
  const midY = rowH / 2

  visibleCells.forEach((cell, i) => {
    const x = cx(i)
    if (cell.type === 'through') {
      elems.push(
        <line key={`v${i}`} x1={x} y1={0} x2={x} y2={rowH}
          stroke={cell.color} strokeWidth={1.5} />
      )
    } else if (cell.type === 'nodeHere') {
      elems.push(
        <line key={`vn${i}`} x1={x} y1={0} x2={x} y2={rowH}
          stroke={cell.color} strokeWidth={1.5} opacity={0.4} />
      )
      elems.push(
        <circle key={`c${i}`} cx={x} cy={midY} r={4}
          fill={cell.color} strokeWidth={1} style={{ stroke: 'var(--bg)' }} />
      )
    } else if (cell.type === 'mergeFrom' && cell.targetLane !== undefined) {
      const tx = cx(cell.targetLane)
      const d = `M ${x} 0 C ${x} ${midY}, ${tx} ${midY}, ${tx} ${midY}`
      elems.push(
        <path key={`m${i}`} d={d} fill="none" stroke={cell.color} strokeWidth={1.5} />
      )
    } else if (cell.type === 'branchTo' && cell.targetLane !== undefined) {
      const tx = cx(cell.targetLane)
      const d = `M ${tx} ${midY} C ${tx} ${midY}, ${x} ${midY}, ${x} ${rowH}`
      elems.push(
        <path key={`b${i}`} d={d} fill="none" stroke={cell.color} strokeWidth={1.5} />
      )
    }
  })

  return (
    <svg width={svgW} height={rowH} style={{ flexShrink: 0, overflow: 'visible' }}>
      {elems}
    </svg>
  )
}

function WorkingTreeNode({ files, lane, color }: { files: string[]; lane: number; color: string }) {
  const [expanded, setExpanded] = useState(false)
  const { staged, unstaged, untracked } = parseLines(files)
  const svgW = Math.max((lane + 1) * LANE_W, LANE_W)
  const cx = lane * LANE_W + LANE_W / 2

  return (
    <div style={{ flexShrink: 0 }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: ROW_H,
          cursor: 'pointer',
          paddingRight: 8,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <svg width={svgW} height={ROW_H} style={{ flexShrink: 0, overflow: 'visible' }}>
          <line x1={cx} y1={ROW_H / 2} x2={cx} y2={ROW_H} stroke={color} strokeWidth={1.5} opacity={0.4} />
          <circle cx={cx} cy={ROW_H / 2} r={4} fill="none" stroke={color}
            strokeWidth={1.5} strokeDasharray="2,2" style={{ stroke: color }} />
        </svg>
        <span style={{ color: 'var(--text-dim)', fontSize: 11, marginLeft: 4 }}>
          {files.length} change{files.length !== 1 ? 's' : ''}
        </span>
      </div>
      {expanded && (
        <div style={{ paddingLeft: svgW + 4, paddingBottom: 4 }}>
          {staged.length > 0 && (
            <>
              <div style={{ color: 'var(--text-faintest)', fontSize: 10, padding: '2px 0' }}>Staged</div>
              {staged.map((f, i) => (
                <div key={`s${i}`} style={{ color: f.color, fontSize: 10, padding: '1px 0',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {f.label}
                </div>
              ))}
            </>
          )}
          {unstaged.length > 0 && (
            <>
              <div style={{ color: 'var(--text-faintest)', fontSize: 10, padding: '2px 0' }}>Unstaged</div>
              {unstaged.map((f, i) => (
                <div key={`u${i}`} style={{ color: f.color, fontSize: 10, padding: '1px 0',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.75 }}>
                  {f.label}
                </div>
              ))}
            </>
          )}
          {untracked.length > 0 && (
            <>
              <div style={{ color: 'var(--text-faintest)', fontSize: 10, padding: '2px 0' }}>Untracked</div>
              {untracked.map((f, i) => (
                <div key={`ut${i}`} style={{ color: f.color, fontSize: 10, padding: '1px 0',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  ? {f.label}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

const DIFF_STATUS_COLOR: Record<string, string> = {
  M: 'var(--git-modified)', A: 'var(--git-added)', D: 'var(--git-deleted)',
  R: 'var(--git-renamed)', C: 'var(--git-renamed)',
}

function CommitRow({ row, maxLanes, changedFiles }: { row: GraphRow; maxLanes: number; changedFiles?: Array<{ status: string; file: string }> }) {
  const [expanded, setExpanded] = useState(false)
  const { commit, cells } = row
  const visibleCells = cells.slice(0, maxLanes)
  const svgW = Math.max(visibleCells.length * LANE_W, LANE_W)

  return (
    <div style={{ flexShrink: 0 }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: ROW_H,
          cursor: 'pointer',
          paddingRight: 8,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <GraphSvg cells={visibleCells} rowH={ROW_H} maxLanes={maxLanes} />
        <div style={{ flex: 1, minWidth: 0, marginLeft: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          {commit.refs.map((r, i) => <RefBadge key={i} name={r} />)}
          <span style={{
            color: 'var(--text-secondary)',
            fontSize: 11,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {commit.subject}
          </span>
        </div>
      </div>
      {expanded && (
        <div style={{
          paddingLeft: svgW + 4,
          paddingBottom: 4,
          fontSize: 10,
          color: 'var(--text-faint)',
          lineHeight: 1.6,
        }}>
          <div style={{ color: 'var(--text-dim)', fontFamily: FONT_MONO }}>{commit.shortHash}</div>
          <div>{commit.author}</div>
          <div>{commit.relativeTime}</div>
          {changedFiles && changedFiles.length > 0 && (
            <div style={{ marginTop: 2 }}>
              {changedFiles.map((f, i) => (
                <div key={i} style={{
                  color: DIFF_STATUS_COLOR[f.status] ?? 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {f.status} {f.file}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function GitGraphPanel() {
  const activeTerminalId = useAppStore(s => s.activeTerminalId)
  const focusedPaneId = useAppStore(s => s.focusedPaneId)
  const splitLayouts = useAppStore(s => s.splitLayouts)
  const terminals = useAppStore(s => s.terminals)
  // In split mode, use the focused pane's context
  const split = splitLayouts.find(sl => sl.leftId === activeTerminalId || sl.rightId === activeTerminalId)
  const effectiveId = (split && focusedPaneId) ? focusedPaneId : activeTerminalId
  const cwd = terminals.find(t => t.id === effectiveId)?.cwd ?? ''
  const gitSettings = useAppStore(s => s.settings.pluginSettings.git) as GitPluginSettings

  const [graphData, setGraphData] = useState<GraphData>(null)
  const [rows, setRows] = useState<GraphRow[]>([])
  const [loaded, setLoaded] = useState(false)

  const fetchGraph = useCallback(() => {
    if (!effectiveId || !cwd) { setGraphData(null); setRows([]); setLoaded(true); useGitAvailability.setState({ available: false }); return }
    window.termAPI.gitGraph(effectiveId, cwd, gitSettings.maxCommits).then(data => {
      setGraphData(data)
      setRows(data ? computeGraphRows(data.commits) : [])
      setLoaded(true)
      useGitAvailability.setState({ available: !!data })
    })
  }, [effectiveId, cwd, gitSettings.maxCommits])

  const isActive = useAppStore(s => s.activeRightPlugin === 'git')

  useEffect(() => {
    setLoaded(false)
    fetchGraph()
  }, [fetchGraph])

  // Refetch when panel becomes the active plugin
  useEffect(() => {
    if (isActive) fetchGraph()
  }, [isActive])

  useEffect(() => {
    return window.termAPI.onGitUpdate((id) => {
      if (id === effectiveId) fetchGraph()
    })
  }, [effectiveId, fetchGraph])

  if (!loaded || !graphData) return (
    <div data-testid="plugin-panel-git" style={{
      flex: 1,
      minHeight: 0,
      fontFamily: FONT_MONO,
      fontSize: TYPE.body,
      color: 'var(--text-secondary)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={panelTitleStyle}>Git</div>
      {loaded && <div style={emptyState}>Not a git repository</div>}
    </div>
  )

  const headLane = 0
  const headColor = LANE_COLORS[headLane % LANE_COLORS.length]

  return (
    <div data-testid="plugin-panel-git" style={{
      flex: 1,
      minHeight: 0,
      fontFamily: FONT_MONO,
      fontSize: TYPE.body,
      color: 'var(--text-secondary)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={panelTitleStyle}>Git</div>
      <div style={{
        padding: '4px 12px',
        fontSize: TYPE.sm,
        color: 'var(--text-faint)',
        display: 'flex',
        alignItems: 'center',
        gap: SPACE.sm,
        flexShrink: 0,
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <span style={{ fontWeight: 600 }}>{graphData.branch}</span>
        {graphData.ahead > 0 && (
          <span style={{ color: 'var(--status-ahead)', fontSize: TYPE.sm }}>{'\u2191'}{graphData.ahead}</span>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {graphData.dirty && (
          <WorkingTreeNode
            files={graphData.files}
            lane={headLane}
            color={headColor}
          />
        )}
        {rows.length === 0 ? (
          <div style={emptyState}>
            No commits
          </div>
        ) : (
          rows.map((row, i) => (
            <CommitRow key={row.commit.hash} row={row} maxLanes={gitSettings.maxLanes}
              changedFiles={i === 0 ? graphData.headFiles : undefined} />
          ))
        )}
      </div>
    </div>
  )
}
