export type TimetablePoleSpan = {
  colSpan: number
}

export type TimetableSortableColumn<T> = {
  item: T
  compareValues: (number | null)[]
}

export function sortTimetableColumns<T>(columns: TimetableSortableColumn<T>[], poles: TimetablePoleSpan[]): T[] {
  const sorted: TimetableSortableColumn<T>[] = []
  const remaining = [...columns]

  while (remaining.length > 0) {
    let progress = false

    for (let remainingIndex = 0; remainingIndex < remaining.length; ) {
      const check = remaining[remainingIndex]
      let addIndex = -1

      if (sorted.length === 0) {
        addIndex = 0
      } else {
        for (let sortedIndex = 0; sortedIndex < sorted.length; sortedIndex += 1) {
          const target = sorted[sortedIndex]

          for (let poleIndex = 0; poleIndex < poles.length; poleIndex += 1) {
            const targetTime = compareValueAt(target, poleIndex)
            const checkTime = compareValueAt(check, poleIndex)

            if (targetTime !== null && checkTime !== null) {
              if (checkTime < targetTime) {
                if (firstSortedIndexWithValue(sorted, poleIndex) === sortedIndex && addIndex === -1) {
                  addIndex = sortedIndex
                  break
                }
                break
              }
              addIndex = sortedIndex + 1
              break
            }

            const colSpan = poles[poleIndex]?.colSpan ?? 1
            if (colSpan > 1) {
              const targetTimes = compareValuesInRange(target, poleIndex, colSpan)
              const checkTimes = compareValuesInRange(check, poleIndex, colSpan)

              if (targetTimes.some(isComparableTime) && checkTimes.some(isComparableTime)) {
                const targetFirstIndex = targetTimes.findIndex(isComparableTime)
                const targetLastIndex = findLastIndex(targetTimes, isComparableTime)
                const checkFirstIndex = checkTimes.findIndex(isComparableTime)
                const checkLastIndex = findLastIndex(checkTimes, isComparableTime)

                if (targetFirstIndex > checkLastIndex) {
                  const targetFirstTime = targetTimes[targetFirstIndex]
                  const checkLastTime = checkTimes[checkLastIndex]
                  if (targetFirstTime !== null && checkLastTime !== null) {
                    if (targetFirstTime > checkLastTime) {
                      if (sortedIndex === 0) {
                        addIndex = 0
                        break
                      }
                    } else if (targetFirstTime < checkLastTime) {
                      addIndex = sortedIndex + 1
                      break
                    }
                  }
                } else if (targetLastIndex < checkFirstIndex) {
                  const targetLastTime = targetTimes[targetLastIndex]
                  const checkFirstTime = checkTimes[checkFirstIndex]
                  if (targetLastTime !== null && checkFirstTime !== null) {
                    if (targetLastTime < checkFirstTime) {
                      addIndex = sortedIndex + 1
                      break
                    } else if (targetLastTime > checkFirstTime) {
                      if (sortedIndex === 0) {
                        addIndex = 0
                        break
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (addIndex !== -1) {
        sorted.splice(addIndex, 0, check)
        remaining.splice(remainingIndex, 1)
        progress = true
      } else if (check.compareValues.length === 0) {
        remaining.splice(remainingIndex, 1)
        progress = true
      } else {
        remainingIndex += 1
      }
    }

    if (!progress) {
      sorted.push(...remaining)
      remaining.length = 0
    }
  }

  return sorted.map((column) => column.item)
}

export function parseTimetableCompareValue(value: string | null | undefined): number | null {
  if (!value) {
    return null
  }
  const parsed = Number(value.trim())
  return Number.isFinite(parsed) ? parsed : null
}

function compareValueAt<T>(column: TimetableSortableColumn<T>, index: number): number | null {
  return column.compareValues[index] ?? null
}

function compareValuesInRange<T>(column: TimetableSortableColumn<T>, start: number, count: number): (number | null)[] {
  return Array.from({ length: count }, (_, index) => compareValueAt(column, start + index))
}

function firstSortedIndexWithValue<T>(columns: TimetableSortableColumn<T>[], poleIndex: number): number {
  return columns.findIndex((column) => compareValueAt(column, poleIndex) !== null)
}

function isComparableTime(value: number | null): value is number {
  return value !== null
}

function findLastIndex<T>(values: T[], predicate: (value: T) => boolean): number {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (predicate(values[index] as T)) {
      return index
    }
  }
  return -1
}
