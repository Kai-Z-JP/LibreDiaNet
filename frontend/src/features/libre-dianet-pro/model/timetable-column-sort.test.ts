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

  it('orders trips with non-overlapping timetable ranges by the last and first stop times', () => {
    const poles = Array.from({ length: 5 }, () => ({ colSpan: 1 }))
    const sorted = sortTimetableColumns(
      [
        { item: 'lower-trip', compareValues: [null, null, null, 900, 910] },
        { item: 'upper-trip', compareValues: [800, 810, null, null, null] },
      ],
      poles,
    )

    expect(sorted).toEqual(['upper-trip', 'lower-trip'])
  })

  it('prioritizes endpoint times when vertical order and time order disagree', () => {
    const poles = Array.from({ length: 5 }, () => ({ colSpan: 1 }))
    const sorted = sortTimetableColumns(
      [
        { item: 'upper-trip', compareValues: [900, 910, null, null, null] },
        { item: 'lower-trip', compareValues: [null, null, null, 800, 810] },
      ],
      poles,
    )

    expect(sorted).toEqual(['lower-trip', 'upper-trip'])
  })

  it('orders a same-time starting trip before an ending trip in a non-overlapping range', () => {
    const poles = Array.from({ length: 5 }, () => ({ colSpan: 1 }))
    const sorted = sortTimetableColumns(
      [
        { item: 'ending-trip', compareValues: [800, 900, null, null, null] },
        { item: 'starting-trip', compareValues: [null, null, null, 900, 1000] },
      ],
      poles,
    )

    expect(sorted).toEqual(['starting-trip', 'ending-trip'])
  })

  it('places an early lower-row trip before multiple later upper-row trips', () => {
    const poles = Array.from({ length: 5 }, () => ({ colSpan: 1 }))
    const sorted = sortTimetableColumns(
      [
        { item: '0900-upper', compareValues: [900, 919, null, null, null] },
        { item: '1005-upper', compareValues: [1005, 1051, null, null, null] },
        { item: '0800-lower', compareValues: [null, null, null, 800, 850] },
      ],
      poles,
    )

    expect(sorted).toEqual(['0800-lower', '0900-upper', '1005-upper'])
  })

  it('keeps overlapping trips without comparable rows in input order', () => {
    const poles = Array.from({ length: 5 }, () => ({ colSpan: 1 }))
    const sorted = sortTimetableColumns(
      [
        { item: 'first', compareValues: [800, null, null, 900, null] },
        { item: 'second', compareValues: [null, 810, 820, null, 910] },
      ],
      poles,
    )

    expect(sorted).toEqual(['first', 'second'])
  })
})
