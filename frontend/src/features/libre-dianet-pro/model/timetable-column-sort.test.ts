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
