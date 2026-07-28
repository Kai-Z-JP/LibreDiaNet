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
        sortedLoop: for (let sortedIndex = 0; sortedIndex < sorted.length; sortedIndex += 1) {
          const target = sorted[sortedIndex]
          const endpointOrder = compareNonOverlappingRangeEndpoints(check, target)
          let hasEqualSharedTime = false

          if (endpointOrder !== null && endpointOrder < 0) {
            addIndex = sortedIndex
            break
          }
          if (endpointOrder !== null && endpointOrder > 0) {
            addIndex = sortedIndex + 1
            continue
          }

          for (let poleIndex = 0; poleIndex < poles.length; poleIndex += 1) {
            const targetTime = compareValueAt(target, poleIndex)
            const checkTime = compareValueAt(check, poleIndex)

            if (targetTime !== null && checkTime !== null) {
              if (checkTime < targetTime) {
                addIndex = sortedIndex
                break sortedLoop
              }
              if (checkTime > targetTime) {
                addIndex = sortedIndex + 1
                break
              }
              hasEqualSharedTime = true
              continue
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
                      addIndex = sortedIndex
                      break sortedLoop
                    } else if (targetFirstTime < checkLastTime) {
                      addIndex = sortedIndex + 1
                      break
                    } else if (targetFirstTime === checkLastTime) {
                      addIndex = sortedIndex
                      break sortedLoop
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
                      addIndex = sortedIndex
                      break sortedLoop
                    } else if (targetLastTime === checkFirstTime) {
                      addIndex = sortedIndex + 1
                      break
                    }
                  }
                }
              }
            }
          }

          if (hasEqualSharedTime) {
            addIndex = sortedIndex + 1
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

function compareNonOverlappingRangeEndpoints<T>(check: TimetableSortableColumn<T>, target: TimetableSortableColumn<T>): number | null {
  const checkFirstIndex = check.compareValues.findIndex(isComparableTime)
  const checkLastIndex = findLastIndex(check.compareValues, isComparableTime)
  const targetFirstIndex = target.compareValues.findIndex(isComparableTime)
  const targetLastIndex = findLastIndex(target.compareValues, isComparableTime)

  if (checkFirstIndex === -1 || targetFirstIndex === -1) {
    return null
  }

  if (checkLastIndex < targetFirstIndex) {
    const checkLastTime = check.compareValues[checkLastIndex] as number
    const targetFirstTime = target.compareValues[targetFirstIndex] as number
    return checkLastTime <= targetFirstTime ? -1 : 1
  }

  if (targetLastIndex < checkFirstIndex) {
    const targetLastTime = target.compareValues[targetLastIndex] as number
    const checkFirstTime = check.compareValues[checkFirstIndex] as number
    return targetLastTime <= checkFirstTime ? 1 : -1
  }

  return null
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
