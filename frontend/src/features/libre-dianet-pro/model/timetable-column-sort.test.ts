import { sortTimetableColumns } from './timetable-column-sort'

describe('sortTimetableColumns', () => {
  it('orders columns by comparable times on the same row', () => {
    const sorted = sortTimetableColumns(
      [
        { item: 'late', compareValues: [900] },
        { item: 'early', compareValues: [800] },
      ],
      [{ colSpan: 1 }],
    )

    expect(sorted).toEqual(['early', 'late'])
  })

  it('keeps ascending same-row times ascending after the second column', () => {
    const sorted = sortTimetableColumns(
      [
        { item: '0800', compareValues: [800] },
        { item: '0810', compareValues: [810] },
        { item: '0820', compareValues: [820] },
        { item: '0830', compareValues: [830] },
      ],
      [{ colSpan: 1 }],
    )

    expect(sorted).toEqual(['0800', '0810', '0820', '0830'])
  })

  it('uses time positions inside a multi-row stop interval', () => {
    const sorted = sortTimetableColumns(
      [
        { item: 'lower-row-trip', compareValues: [null, 900] },
        { item: 'upper-row-trip', compareValues: [800, null] },
      ],
      [{ colSpan: 2 }, { colSpan: 1 }],
    )

    expect(sorted).toEqual(['upper-row-trip', 'lower-row-trip'])
  })

  it('orders same-time departure before arrival inside a multi-row stop interval', () => {
    const sorted = sortTimetableColumns(
      [
        { item: 'arrival', compareValues: [900, null] },
        { item: 'departure', compareValues: [null, 900] },
      ],
      [{ colSpan: 2 }, { colSpan: 1 }],
    )

    expect(sorted).toEqual(['departure', 'arrival'])
  })

  it('keeps same-time departure before arrival when departure is already sorted first', () => {
    const sorted = sortTimetableColumns(
      [
        { item: 'departure', compareValues: [null, 900] },
        { item: 'arrival', compareValues: [900, null] },
      ],
      [{ colSpan: 2 }, { colSpan: 1 }],
    )

    expect(sorted).toEqual(['departure', 'arrival'])
  })

  it('keeps unresolved columns in their conservative input order', () => {
    const sorted = sortTimetableColumns(
      [
        { item: 'first', compareValues: [null] },
        { item: 'second', compareValues: [null] },
      ],
      [{ colSpan: 1 }],
    )

    expect(sorted).toEqual(['first', 'second'])
  })
})
