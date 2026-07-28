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

  it('uses a later shared pole to break a same-time tie', () => {
    const sorted = sortTimetableColumns(
      [
        { item: 'later', compareValues: [800, null, 900] },
        { item: 'earlier', compareValues: [800, null, 850] },
      ],
      [{ colSpan: 1 }, { colSpan: 1 }, { colSpan: 1 }],
    )

    expect(sorted).toEqual(['earlier', 'later'])
  })

  it('keeps input order when all shared pole times are equal', () => {
    const sorted = sortTimetableColumns(
      [
        { item: 'first', compareValues: [800, null, 900] },
        { item: 'second', compareValues: [800, 850, 900] },
      ],
      [{ colSpan: 1 }, { colSpan: 1 }, { colSpan: 1 }],
    )

    expect(sorted).toEqual(['first', 'second'])
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

  it('orders same-time arrival before departure inside a multi-row stop interval', () => {
    const sorted = sortTimetableColumns(
      [
        { item: 'arrival', compareValues: [900, null] },
        { item: 'departure', compareValues: [null, 900] },
      ],
      [{ colSpan: 2 }, { colSpan: 1 }],
    )

    expect(sorted).toEqual(['arrival', 'departure'])
  })

  it('moves same-time arrival before departure when departure is already sorted first', () => {
    const sorted = sortTimetableColumns(
      [
        { item: 'departure', compareValues: [null, 900] },
        { item: 'arrival', compareValues: [900, null] },
      ],
      [{ colSpan: 2 }, { colSpan: 1 }],
    )

    expect(sorted).toEqual(['arrival', 'departure'])
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

  it('orders a same-time ending trip before a starting trip in a non-overlapping range', () => {
    const poles = Array.from({ length: 5 }, () => ({ colSpan: 1 }))
    const sorted = sortTimetableColumns(
      [
        { item: 'ending-trip', compareValues: [800, 900, null, null, null] },
        { item: 'starting-trip', compareValues: [null, null, null, 900, 1000] },
      ],
      poles,
    )

    expect(sorted).toEqual(['ending-trip', 'starting-trip'])
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

  it('inserts an early lower-segment trip between upper- and lower-segment trips', () => {
    const sorted = sortTimetableColumns(
      [
        { item: '0809-upper', compareValues: [809, null] },
        { item: '0930-upper', compareValues: [930, 930] },
        { item: '1017-lower', compareValues: [null, 1017] },
        { item: 'crossing-trip', compareValues: [1000, 800] },
        { item: '0827-lower', compareValues: [null, 827] },
      ],
      [{ colSpan: 1 }, { colSpan: 1 }],
    )

    expect(sorted).toEqual(['0809-upper', '0827-lower', '0930-upper', 'crossing-trip', '1017-lower'])
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
