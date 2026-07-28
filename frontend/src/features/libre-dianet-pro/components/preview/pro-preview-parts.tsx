import { Box } from '@mui/material'
import { justifyTextClass } from '../../model/pro-preview-display-helpers'

export function DestinationPreview({ destinations }: { destinations: string[] }) {
  const items = destinations.length === 0 ? [''] : destinations
  return (
    <Box className={items.length > 1 ? 'pro-preview-destination-columns' : 'pro-preview-destination-single'}>
      {items
        .slice(0, 2)
        .reverse()
        .map((destination, index) => (
          <Box key={`${destination}-${index}`} className={`pro-preview-vertical-text ${justifyTextClass(destination)}`}>
            {destination}
          </Box>
        ))}
    </Box>
  )
}

export function PreviewCellText({ text, rowSpan }: { text: string; rowSpan: number }) {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (rowSpan > 1) {
    return (
      <Box className="pro-preview-cell-lines">
        {lines
          .slice(0, 2)
          .reverse()
          .map((line) => (
            <Box key={line} className={`pro-preview-cell-vertical`}>
              {line}
            </Box>
          ))}
      </Box>
    )
  }
  return <>{text || ' '}</>
}
