import styled from '@emotion/styled'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import { Chip, Collapse } from '@mui/material'
import { useState } from 'react'

export type JsonValue = null | string | number | boolean | JsonValue[] | { [key: string]: JsonValue }

export function JsonTree({ name, value, defaultOpen = false }: { name: string; value: JsonValue; defaultOpen?: boolean }) {
  return <JsonTreeNode name={name} value={value} depth={0} defaultOpen={defaultOpen} />
}

function JsonTreeNode({
  name,
  value,
  depth,
  defaultOpen = false,
}: {
  name: string
  value: JsonValue
  depth: number
  defaultOpen?: boolean
}) {
  if (Array.isArray(value)) {
    return <JsonBranch name={name} value={value} depth={depth} defaultOpen={defaultOpen} />
  }
  if (value !== null && typeof value === 'object') {
    return <JsonBranch name={name} value={value} depth={depth} defaultOpen={defaultOpen} />
  }
  return (
    <JsonLeaf $depth={depth}>
      <JsonKey>{name}</JsonKey>
      <JsonColon>:</JsonColon>
      <ScalarValue value={value} />
    </JsonLeaf>
  )
}

function JsonBranch({
  name,
  value,
  depth,
  defaultOpen,
}: {
  name: string
  value: JsonValue[] | { [key: string]: JsonValue }
  depth: number
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item] as const) : Object.entries(value)
  const typeLabel = Array.isArray(value) ? `Array(${value.length})` : `Object(${entries.length})`

  return (
    <JsonBranchRoot>
      <JsonBranchButton type="button" $depth={depth} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        {open ? <ExpandMoreIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
        <JsonKey>{name}</JsonKey>
        <JsonColon>:</JsonColon>
        <JsonBadge label={typeLabel} size="small" />
      </JsonBranchButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <JsonChildren>
          {entries.length === 0 ? (
            <JsonEmpty $depth={depth + 1}>empty</JsonEmpty>
          ) : (
            entries.map(([key, child]) => <JsonTreeNode key={key} name={key} value={child} depth={depth + 1} />)
          )}
        </JsonChildren>
      </Collapse>
    </JsonBranchRoot>
  )
}

function ScalarValue({ value }: { value: null | string | number | boolean }) {
  if (value === null) {
    return <JsonScalar $kind="null">null</JsonScalar>
  }
  if (typeof value === 'string') {
    return <JsonScalar $kind="string">{JSON.stringify(value)}</JsonScalar>
  }
  if (typeof value === 'number') {
    return <JsonScalar $kind="number">{value}</JsonScalar>
  }
  return <JsonScalar $kind="boolean">{String(value)}</JsonScalar>
}

const JsonBranchRoot = styled.div`
  min-width: 0;
`

const JsonBranchButton = styled.button<{ $depth: number }>`
  display: flex;
  width: 100%;
  min-height: 32px;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  padding: 4px 8px 4px ${({ $depth }) => 8 + $depth * 18}px;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background-color: rgba(25, 118, 210, 0.08);
  }
`

const JsonChildren = styled.div`
  min-width: 0;
`

const JsonLeaf = styled.div<{ $depth: number }>`
  display: flex;
  min-height: 30px;
  min-width: 0;
  align-items: baseline;
  gap: 6px;
  padding: 4px 8px 4px ${({ $depth }) => 34 + $depth * 18}px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 0.875rem;
`

const JsonKey = styled.span`
  flex: 0 0 auto;
  color: #123f6d;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 0.875rem;
  font-weight: 700;
`

const JsonColon = styled.span`
  flex: 0 0 auto;
  color: #5f6673;
`

const JsonBadge = styled(Chip)`
  height: 22px;
  border-radius: 6px;
  background-color: #e8eef7;

  .MuiChip-label {
    padding: 0 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
    font-size: 0.75rem;
  }
`

const JsonScalar = styled.span<{ $kind: 'string' | 'number' | 'boolean' | 'null' }>`
  min-width: 0;
  overflow-wrap: anywhere;
  color: ${({ $kind }) => {
    switch ($kind) {
      case 'string':
        return '#0b6f3a'
      case 'number':
        return '#8a4b00'
      case 'boolean':
        return '#7a2f8f'
      case 'null':
        return '#6b7280'
    }
  }};
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 0.875rem;
`

const JsonEmpty = styled.div<{ $depth: number }>`
  padding: 4px 8px 4px ${({ $depth }) => 34 + $depth * 18}px;
  color: #6b7280;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 0.875rem;
`
