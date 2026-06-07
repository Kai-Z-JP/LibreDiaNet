import { selectActiveServiceIdsForWeekday } from './gtfsRepository'

type CalendarRows = Parameters<typeof selectActiveServiceIdsForWeekday>[0]

const calendarRows: CalendarRows = [
  {
    service_id: 'weekday-only',
    start_date: '20260401',
    end_date: '20270331',
    sunday: 0,
    monday: 1,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
  },
  {
    service_id: 'outside-range',
    start_date: '20270401',
    end_date: '20280331',
    sunday: 0,
    monday: 1,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
  },
  {
    service_id: 'sunday-only',
    start_date: '20260401',
    end_date: '20270331',
    sunday: 1,
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
  },
]

describe('selectActiveServiceIdsForWeekday', () => {
  it('selects services by weekday flag within the reference date range', () => {
    expect(selectActiveServiceIdsForWeekday(calendarRows, 'monday', '2026-04-01')).toEqual(['weekday-only'])
    expect(selectActiveServiceIdsForWeekday(calendarRows, 'tuesday', '2026-04-01')).toEqual([])
    expect(selectActiveServiceIdsForWeekday(calendarRows, 'sunday', '2026-04-01')).toEqual(['sunday-only'])
  })

  it('excludes services outside the reference date range', () => {
    expect(selectActiveServiceIdsForWeekday(calendarRows, 'monday', '2027-04-01')).toEqual(['outside-range'])
  })
})
