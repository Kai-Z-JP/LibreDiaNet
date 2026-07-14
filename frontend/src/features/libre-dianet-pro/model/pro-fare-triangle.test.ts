import { describe, expect, it } from 'vitest'
import type { FareV1Attribute, FareV1Data, FareV1Rule } from '../../../gtfsRepository'
import { EMPTY_OVERRIDE, type GtfsStop, type ProPoleDetail, type ProPoleStop } from '../../../types'
import { stopPatternKey } from '../../../utils'
import {
  buildFareTriangle,
  buildFareTriangleAxis,
  buildFareTrianglePresentation,
  fareTriangleCellAmounts,
  fareTriangleCellKey,
  fareTriangleUniformAmounts,
  type FareTriangle,
  type FareTriangleAxisEntry,
  type FareTriangleCandidate,
  type FareTriangleCell,
} from './pro-fare-triangle'
import type { ProConstructedRoute } from './pro-types'

describe('buildFareTriangleAxis', () => {
  it('omits empty poles, merges consecutive equal names, and unions their stops', () => {
    const firstPattern = pattern('a', 'b')
    const secondPattern = pattern('a-platform-2', 'b')
    const poles = [
      pole('central-1', 'source-a', firstPattern, 0),
      emptyPole('spacer'),
      pole('central-2', 'source-a', secondPattern, 0),
      pole('east', 'source-a', firstPattern, 1),
    ]
    const stopMap = {
      'source-a::a': stop('a', '中央'),
      'source-a::a-platform-2': stop('a-platform-2', '中央'),
      'source-a::b': stop('b', '東口'),
    }

    const axis = buildFareTriangleAxis(poles, stopMap)

    expect(axis.map((entry) => entry.displayName)).toEqual(['中央', '東口'])
    expect(axis[0]?.poleIds).toEqual(['central-1', 'central-2'])
    expect(axis[0]?.stops.map((item) => item.id)).toEqual(['a', 'a-platform-2'])
  })

  it('retains nonconsecutive entries with the same display name', () => {
    const routePattern = pattern('a', 'b', 'c')
    const poles = [
      pole('central-1', 'source-a', routePattern, 0, '中央'),
      pole('east', 'source-a', routePattern, 1, '東口'),
      pole('central-2', 'source-a', routePattern, 2, '中央'),
    ]

    expect(buildFareTriangleAxis(poles, {}).map((entry) => entry.displayName)).toEqual(['中央', '東口', '中央'])
  })

  it('keeps unnamed adjacent stops distinct by falling back to their stop IDs', () => {
    const routePattern = pattern('a', 'b')

    expect(buildFareTriangleAxis([pole('a', 'source-a', routePattern, 0), pole('b', 'source-a', routePattern, 1)], {})).toMatchObject([
      { displayName: 'a' },
      { displayName: 'b' },
    ])
  })
})

describe('buildFareTriangle route-pattern matching', () => {
  it('uses only a selected pattern where boarding occurs before alighting, without reverse fallback', () => {
    const forward = pattern('a', 'b', 'c')
    const reverse = pattern('c', 'b', 'a')
    const notSelected = pattern('a', 'x', 'c')
    const axis = [
      axisEntry('A', [
        poleStop('source-a', forward, 0),
        poleStop('source-a', reverse, 2),
        poleStop('source-a', notSelected, 0),
        poleStop('source-b', forward, 0),
      ]),
      axisEntry('C', [
        poleStop('source-a', forward, 2),
        poleStop('source-a', reverse, 0),
        poleStop('source-a', notSelected, 2),
        poleStop('source-b', forward, 2),
      ]),
    ]
    const fareDataBySource = {
      'source-a': fareData({
        stopZoneById: { a: 'zone-a', c: 'zone-c' },
        routeAgencyById: { route: 'agency-a', 'other-route': 'agency-a' },
        attributes: [attribute('forward', 200), attribute('other-route', 900)],
        rules: [rule('forward', { routeId: 'route' }), rule('other-route', { routeId: 'other-route' })],
      }),
      'source-b': fareData({
        stopZoneById: { a: 'zone-a', c: 'zone-c' },
        attributes: [attribute('wrong-source', 999)],
        rules: [rule('wrong-source')],
      }),
    }

    const triangle = buildFareTriangle({
      axis,
      constructedRoutes: [constructedRoute('source-a', 'route', 0, [forward]), constructedRoute('source-a', 'route', 1, [reverse])],
      fareDataBySource,
      sourceNameMap: { 'source-a': 'Source A', 'source-b': 'Source B' },
      stopMap: {},
    })

    const candidates = cell(triangle.cells, 0, 1).candidates
    expect(candidates.map((candidate) => [candidate.sourceId, candidate.routeId, candidate.direction, candidate.fareId])).toEqual([
      ['source-a', 'route', 0, 'forward'],
    ])
  })

  it('does not use a stop pattern excluded by the preset', () => {
    const routePattern = pattern('a', 'b')
    const triangle = buildFareTriangle({
      axis: axisForPattern('source-a', routePattern),
      constructedRoutes: [constructedRoute('source-a', 'route', 0, [routePattern])],
      fareDataBySource: {
        'source-a': fareData({
          stopZoneById: { a: 'zone-a', b: 'zone-b' },
          attributes: [attribute('fare', 210)],
          rules: [rule('fare')],
        }),
      },
      sourceNameMap: {},
      stopMap: {},
      excludedStopPatterns: [[`source-a::${stopPatternKey(routePattern)}`]],
    })

    expect(cell(triangle.cells, 0, 1).candidates).toEqual([])
  })

  it('computes a shared pattern key only once while resolving all cells', () => {
    let patternIdReadCount = 0
    const routePattern: GtfsStop[] = ['a', 'b', 'c'].map((stopId, index) => ({
      ...stop(stopId, stopId.toUpperCase()),
      stopSequence: index + 1,
      get stopPatternId() {
        patternIdReadCount += 1
        return 'shared-pattern'
      },
    }))
    const axis = routePattern.map((routeStop, stopIndex) => axisEntry(routeStop.name, [poleStop('source-a', routePattern, stopIndex)]))
    patternIdReadCount = 0

    const triangle = buildFareTriangle({
      axis,
      constructedRoutes: [constructedRoute('source-a', 'route', 0, [routePattern])],
      fareDataBySource: {
        'source-a': fareData({
          stopZoneById: { a: 'zone', b: 'zone', c: 'zone' },
          attributes: [attribute('fare', 210)],
          rules: [],
        }),
      },
      sourceNameMap: {},
      stopMap: {},
    })

    expect(cell(triangle.cells, 0, 1).candidates).toHaveLength(1)
    expect(cell(triangle.cells, 0, 2).candidates).toHaveLength(1)
    expect(cell(triangle.cells, 1, 2).candidates).toHaveLength(1)
    expect(patternIdReadCount).toBe(routePattern.length + 1)
  })
})

describe('buildFareTriangle fare resolution', () => {
  it('matches route and zones, treating null rule fields as wildcards', () => {
    const routePattern = pattern('a', 'b')
    const result = resolveSingleCell({
      routePattern,
      data: fareData({
        stopZoneById: { a: 'zone-a', b: 'zone-b' },
        attributes: [attribute('exact', 210), attribute('wildcard', 240), attribute('wrong-route', 800), attribute('wrong-zone', 900)],
        rules: [
          rule('exact', { routeId: 'route', originId: 'zone-a', destinationId: 'zone-b' }),
          rule('wildcard'),
          rule('wrong-route', { routeId: 'another-route' }),
          rule('wrong-zone', { originId: 'zone-x' }),
        ],
      }),
    })

    expect(result.candidates.map((candidate) => candidate.fareId)).toEqual(['exact', 'wildcard'])
  })

  it('uses agency-matched flat fares when fare rules are absent or empty', () => {
    const routePattern = pattern('a', 'b')
    const result = resolveSingleCell({
      routePattern,
      data: fareData({
        fareRulesPresent: false,
        stopZoneById: { a: 'zone-a', b: 'zone-b' },
        routeAgencyById: { route: 'agency-a' },
        attributes: [
          attribute('agency-a', 210, { agencyId: 'agency-a' }),
          attribute('agency-b', 310, { agencyId: 'agency-b' }),
          attribute('all-agencies', 180, { agencyId: null }),
        ],
        rules: [],
      }),
    })

    expect(result.candidates.map((candidate) => candidate.fareId)).toEqual(['agency-a', 'all-agencies'])
  })

  it('reports missing zones, still applies wildcard rules, and excludes contains_id rules', () => {
    const routePattern = pattern('a', 'b')
    const axis = axisForPattern('source-a', routePattern)
    const triangle = buildFareTriangle({
      axis,
      constructedRoutes: [constructedRoute('source-a', 'route', 0, [routePattern])],
      fareDataBySource: {
        'source-a': fareData({
          stopZoneById: { a: null, b: null },
          attributes: [attribute('zone-specific', 210), attribute('wildcard', 240), attribute('contains', 999)],
          rules: [
            rule('zone-specific', { originId: 'zone-a', destinationId: 'zone-b' }),
            rule('wildcard'),
            rule('contains', { containsId: 'zone-via' }),
            rule('unselected-contains', { routeId: 'another-route', containsId: 'other-zone' }),
          ],
        }),
      },
      sourceNameMap: {},
      stopMap: {},
    })

    expect(cell(triangle.cells, 0, 1).candidates.map((candidate) => candidate.fareId)).toEqual(['wildcard'])
    expect(triangle.missingZoneCount).toBe(2)
    expect(triangle.unsupportedContainsRuleCount).toBe(1)
    expect(triangle.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'missing-zone', stopId: 'a' }),
        expect.objectContaining({ kind: 'missing-zone', stopId: 'b' }),
        expect.objectContaining({ kind: 'unsupported-contains-rule', fareId: 'contains', containsId: 'zone-via' }),
      ]),
    )
  })

  it('does not use a contains-only rule as a flat-fare fallback', () => {
    const routePattern = pattern('a', 'b')
    const result = resolveSingleCell({
      routePattern,
      data: fareData({
        stopZoneById: { a: 'zone-a', b: 'zone-b' },
        attributes: [attribute('contains', 500)],
        rules: [rule('contains', { containsId: 'zone-via' })],
      }),
    })

    expect(result.candidates).toEqual([])
  })

  it('excludes a fare ID when a matching rule requires contains_id', () => {
    const routePattern = pattern('a', 'b')
    const result = resolveSingleCell({
      routePattern,
      data: fareData({
        stopZoneById: { a: 'zone-a', b: 'zone-b' },
        attributes: [attribute('mixed-rules', 500)],
        rules: [rule('mixed-rules'), rule('mixed-rules', { containsId: 'zone-via' })],
      }),
    })

    expect(result.candidates).toEqual([])
  })

  it('keeps a supported rule when a contains_id rule with the same fare ID belongs to another route', () => {
    const routePattern = pattern('a', 'b')
    const result = resolveSingleCell({
      routePattern,
      data: fareData({
        stopZoneById: { a: 'zone-a', b: 'zone-b' },
        attributes: [attribute('mixed-rules', 500)],
        rules: [rule('mixed-rules', { routeId: 'route' }), rule('mixed-rules', { routeId: 'another-route', containsId: 'zone-via' })],
      }),
    })

    expect(result.candidates.map((candidate) => candidate.fareId)).toEqual(['mixed-rules'])
  })

  it('reuses fare resolution for cells with the same source, route, and zones', () => {
    const routePattern = pattern('a', 'b', 'c')
    let originRuleReadCount = 0
    const countedRule: FareV1Rule = {
      fareId: 'shared-zone-fare',
      routeId: 'route',
      get originId() {
        originRuleReadCount += 1
        return 'zone'
      },
      destinationId: 'zone',
      containsId: null,
    }

    const triangle = buildFareTriangle({
      axis: routePattern.map((routeStop, stopIndex) => axisEntry(routeStop.name, [poleStop('source-a', routePattern, stopIndex)])),
      constructedRoutes: [constructedRoute('source-a', 'route', 0, [routePattern])],
      fareDataBySource: {
        'source-a': fareData({
          stopZoneById: { a: 'zone', b: 'zone', c: 'zone' },
          attributes: [attribute('shared-zone-fare', 210)],
          rules: [countedRule],
        }),
      },
      sourceNameMap: {},
      stopMap: {},
    })

    expect(cell(triangle.cells, 0, 1).candidates).toHaveLength(1)
    expect(cell(triangle.cells, 0, 2).candidates).toHaveLength(1)
    expect(cell(triangle.cells, 1, 2).candidates).toHaveLength(1)
    expect(originRuleReadCount).toBe(1)
  })

  it('keeps null and literal null zone cache entries distinct', () => {
    const routePattern = pattern('a', 'b', 'c')
    const triangle = buildFareTriangle({
      axis: routePattern.map((routeStop, stopIndex) => axisEntry(routeStop.name, [poleStop('source-a', routePattern, stopIndex)])),
      constructedRoutes: [constructedRoute('source-a', 'route', 0, [routePattern])],
      fareDataBySource: {
        'source-a': fareData({
          stopZoneById: { a: null, b: 'null', c: 'destination' },
          attributes: [attribute('wildcard', 210), attribute('literal-null', 240)],
          rules: [
            rule('wildcard', { destinationId: 'destination' }),
            rule('literal-null', { originId: 'null', destinationId: 'destination' }),
          ],
        }),
      },
      sourceNameMap: {},
      stopMap: {},
    })

    expect(cell(triangle.cells, 0, 2).candidates.map((candidate) => candidate.fareId)).toEqual(['wildcard'])
    expect(cell(triangle.cells, 1, 2).candidates.map((candidate) => candidate.fareId)).toEqual(['wildcard', 'literal-null'])
  })

  it('keeps cache entries separate for the same route and zones in different sources', () => {
    const routePattern = pattern('a', 'b')
    const triangle = buildFareTriangle({
      axis: [
        axisEntry('A', [poleStop('source-a', routePattern, 0), poleStop('source-b', routePattern, 0)]),
        axisEntry('B', [poleStop('source-a', routePattern, 1), poleStop('source-b', routePattern, 1)]),
      ],
      constructedRoutes: [
        constructedRoute('source-a', 'route', 0, [routePattern]),
        constructedRoute('source-b', 'route', 0, [routePattern]),
      ],
      fareDataBySource: {
        'source-a': fareData({
          stopZoneById: { a: 'origin', b: 'destination' },
          attributes: [attribute('source-a-fare', 210)],
          rules: [rule('source-a-fare')],
        }),
        'source-b': fareData({
          stopZoneById: { a: 'origin', b: 'destination' },
          attributes: [attribute('source-b-fare', 240)],
          rules: [rule('source-b-fare')],
        }),
      },
      sourceNameMap: {},
      stopMap: {},
    })

    expect(cell(triangle.cells, 0, 1).candidates.map((candidate) => [candidate.sourceId, candidate.fareId])).toEqual([
      ['source-a', 'source-a-fare'],
      ['source-b', 'source-b-fare'],
    ])
  })
})

describe('fareTriangleCellAmounts', () => {
  it('deduplicates and sorts amounts, and uses cash as the marked IC fallback', () => {
    const routePattern = pattern('a', 'b')
    const result = resolveSingleCell({
      routePattern,
      data: fareData({
        stopZoneById: { a: 'zone-a', b: 'zone-b' },
        attributes: [
          attribute('high', 240, { icPrice: null }),
          attribute('low', 210, { icPrice: 200 }),
          attribute('duplicate-amount', 210, { icPrice: 200 }),
        ],
        rules: [rule('high'), rule('high'), rule('low'), rule('duplicate-amount')],
      }),
    })

    expect(fareTriangleCellAmounts(result, 'cash')).toEqual([210, 240])
    expect(fareTriangleCellAmounts(result, 'ic')).toEqual([200, 240])
    expect(result.candidates.filter((candidate) => candidate.fareId === 'high')).toHaveLength(1)
    expect(result.candidates.find((candidate) => candidate.fareId === 'high')).toMatchObject({
      cashPrice: 240,
      icPrice: 240,
      icFallback: true,
    })
  })
})

describe('buildFareTrianglePresentation', () => {
  it('represents a matching group as one range using its first axis', () => {
    const triangle = presentationTriangle(['A', 'B', 'C', 'D', 'E'], {
      '0:1': fares(100),
      '0:2': fares(100),
      '0:3': fares(100),
      '1:2': fares(100),
      '1:3': fares(100),
      '2:3': fares(100),
      '0:4': fares(210),
      '1:4': fares(210),
      '2:4': fares(210),
      '3:4': fares(210),
    })

    expect(buildFareTrianglePresentation(triangle, 'cash', true)).toEqual({
      items: [
        { kind: 'range', axisIndex: 0, axisIndices: [0, 1, 2, 3] },
        { kind: 'axis', axisIndex: 4 },
      ],
      uniformAmounts: null,
    })
  })

  it('creates a range as soon as two consecutive profiles match', () => {
    const triangle = presentationTriangle(['A', 'B', 'C'], {
      '0:1': fares(100),
      '0:2': fares(210),
      '1:2': fares(210),
    })

    expect(buildFareTrianglePresentation(triangle, 'cash', true).items).toEqual([
      { kind: 'range', axisIndex: 0, axisIndices: [0, 1] },
      { kind: 'axis', axisIndex: 2 },
    ])
  })

  it('groups equal displayed amounts even when fare and zone metadata differ', () => {
    const triangle = presentationTriangle(['A', 'B', 'C'], {
      '0:1': fares(100),
      '0:2': [
        fareCandidate(210, 205, {
          sourceId: 'source-a',
          routeId: 'route-a',
          direction: 0,
          fareId: 'fare-a',
          boardZone: 'zone-a',
          alightZone: 'zone-c-a',
        }),
      ],
      '1:2': [
        fareCandidate(210, 205, {
          sourceId: 'source-b',
          routeId: 'route-b',
          direction: 1,
          fareId: 'fare-b',
          boardZone: 'zone-b',
          alightZone: 'zone-c-b',
        }),
      ],
    })

    expect(buildFareTrianglePresentation(triangle, 'cash', true).items).toEqual([
      { kind: 'range', axisIndex: 0, axisIndices: [0, 1] },
      { kind: 'axis', axisIndex: 2 },
    ])
    expect(buildFareTrianglePresentation(triangle, 'ic', true).items).toEqual([
      { kind: 'range', axisIndex: 0, axisIndices: [0, 1] },
      { kind: 'axis', axisIndex: 2 },
    ])
  })

  it('keeps equal metadata separate when the displayed amounts differ', () => {
    const sharedMetadata: Partial<FareTriangleCandidate> = {
      sourceId: 'source-a',
      routeId: 'route-a',
      direction: 0,
      fareId: 'same-fare',
      boardZone: 'same-board-zone',
      alightZone: 'same-alight-zone',
    }
    const triangle = presentationTriangle(['A', 'B', 'C'], {
      '0:1': fares(100, 90),
      '0:2': [fareCandidate(210, 205, sharedMetadata)],
      '1:2': [fareCandidate(220, 205, sharedMetadata)],
    })

    expect(buildFareTrianglePresentation(triangle, 'cash', true).items).toEqual([0, 1, 2].map((axisIndex) => ({ kind: 'axis', axisIndex })))
    expect(buildFareTrianglePresentation(triangle, 'ic', true).items).toEqual([
      { kind: 'range', axisIndex: 0, axisIndices: [0, 1] },
      { kind: 'axis', axisIndex: 2 },
    ])
  })

  it('compares the deduplicated final IC amounts regardless of candidate order or fallback metadata', () => {
    const triangle = presentationTriangle(['A', 'B', 'C'], {
      '0:1': fares(100, 90),
      '0:2': [fareCandidate(240, 240, { fareId: 'fallback', icFallback: true }), fareCandidate(210, 200, { fareId: 'discount' })],
      '1:2': [
        fareCandidate(210, 200, { fareId: 'other-discount', icFallback: true }),
        fareCandidate(210, 200, { fareId: 'duplicate' }),
        fareCandidate(240, 240, { fareId: 'other-full', icFallback: false }),
      ],
    })

    expect(buildFareTrianglePresentation(triangle, 'ic', true).items).toEqual([
      { kind: 'range', axisIndex: 0, axisIndices: [0, 1] },
      { kind: 'axis', axisIndex: 2 },
    ])
  })

  it('represents all three stops in a matching group as one range', () => {
    const triangle = presentationTriangle(['A', 'B', 'C', 'D'], {
      '0:1': fares(100),
      '0:2': fares(100),
      '1:2': fares(100),
      '0:3': fares(210),
      '1:3': fares(210),
      '2:3': fares(210),
    })

    expect(buildFareTrianglePresentation(triangle, 'cash', true).items).toEqual([
      { kind: 'range', axisIndex: 0, axisIndices: [0, 1, 2] },
      { kind: 'axis', axisIndex: 3 },
    ])
  })

  it('keeps a matching group at the end as one range', () => {
    const triangle = presentationTriangle(['A', 'B', 'C', 'D', 'E'], {
      '0:1': fares(210),
      '0:2': fares(210),
      '0:3': fares(210),
      '0:4': fares(210),
      '1:2': fares(100),
      '1:3': fares(100),
      '1:4': fares(100),
      '2:3': fares(100),
      '2:4': fares(100),
      '3:4': fares(100),
    })

    expect(buildFareTrianglePresentation(triangle, 'cash', true).items).toEqual([
      { kind: 'axis', axisIndex: 0 },
      { kind: 'range', axisIndex: 1, axisIndices: [1, 2, 3, 4] },
    ])
  })

  it('evaluates matching groups independently for cash and IC fares', () => {
    const triangle = presentationTriangle(['A', 'B', 'C', 'D', 'E'], {
      '0:1': fares(100, 100),
      '0:2': fares(100, 100),
      '0:3': fares(100, 100),
      '1:2': fares(100, 100),
      '1:3': fares(100, 100),
      '2:3': fares(100, 100),
      '0:4': fares(210, 200),
      '1:4': fares(210, 205),
      '2:4': fares(210, 200),
      '3:4': fares(210, 200),
    })

    expect(buildFareTrianglePresentation(triangle, 'cash', true).items).toEqual([
      { kind: 'range', axisIndex: 0, axisIndices: [0, 1, 2, 3] },
      { kind: 'axis', axisIndex: 4 },
    ])
    expect(buildFareTrianglePresentation(triangle, 'ic', true).items).toEqual([
      { kind: 'axis', axisIndex: 0 },
      { kind: 'axis', axisIndex: 1 },
      { kind: 'range', axisIndex: 2, axisIndices: [2, 3] },
      { kind: 'axis', axisIndex: 4 },
    ])
  })

  it('treats corresponding unresolved cells as equal while comparing a group', () => {
    const triangle = presentationTriangle(['A', 'B', 'C', 'D', 'E'], {
      '0:4': fares(240),
      '1:4': fares(240),
      '2:4': fares(240),
      '3:4': fares(240),
    })

    expect(buildFareTrianglePresentation(triangle, 'cash', true).items).toEqual([
      { kind: 'range', axisIndex: 0, axisIndices: [0, 1, 2, 3] },
      { kind: 'axis', axisIndex: 4 },
    ])
  })

  it('keeps profiles separate when only one corresponding cell is unresolved', () => {
    const triangle = presentationTriangle(['A', 'B', 'C'], {
      '0:2': fares(240),
    })

    expect(buildFareTrianglePresentation(triangle, 'cash', true).items).toEqual([0, 1, 2].map((axisIndex) => ({ kind: 'axis', axisIndex })))
  })

  it('creates one range when every fare profile in a table is unresolved', () => {
    const triangle = presentationTriangle(['A', 'B', 'C', 'D'], {})

    expect(buildFareTrianglePresentation(triangle, 'cash', true)).toEqual({
      items: [{ kind: 'range', axisIndex: 0, axisIndices: [0, 1, 2, 3] }],
      uniformAmounts: null,
    })
  })

  it('returns a uniform fare only when every pair resolves to the same displayed amounts', () => {
    const uniform = presentationTriangle(['A', 'B', 'C', 'D'], {
      '0:1': fares(210),
      '0:2': fares(210),
      '0:3': fares(210),
      '1:2': fares(210),
      '1:3': fares(210),
      '2:3': fares(210),
    })
    const mixed = presentationTriangle(['A', 'B', 'C'], {
      '0:1': fares(210),
      '0:2': fares(210),
      '1:2': fares(240),
    })

    expect(fareTriangleUniformAmounts(uniform, 'cash')).toEqual([210])
    expect(buildFareTrianglePresentation(uniform, 'cash', true)).toEqual({
      items: [
        { kind: 'axis', axisIndex: 0 },
        { kind: 'axis', axisIndex: 1 },
        { kind: 'axis', axisIndex: 2 },
        { kind: 'axis', axisIndex: 3 },
      ],
      uniformAmounts: [210],
    })
    expect(fareTriangleUniformAmounts(mixed, 'cash')).toBeNull()
    expect(fareTriangleUniformAmounts(presentationTriangle(['A', 'B', 'C'], { '0:1': fares(210) }), 'cash')).toBeNull()
  })

  it('shows the complete table and suppresses the uniform summary when abbreviation is disabled', () => {
    const triangle = presentationTriangle(['A', 'B', 'C'], {
      '0:1': fares(210),
      '0:2': fares(210),
      '1:2': fares(210),
    })

    expect(buildFareTrianglePresentation(triangle, 'cash', false)).toEqual({
      items: [
        { kind: 'axis', axisIndex: 0 },
        { kind: 'axis', axisIndex: 1 },
        { kind: 'axis', axisIndex: 2 },
      ],
      uniformAmounts: null,
    })
  })

  it('does not treat an empty or single-stop table as a uniform fare', () => {
    expect(fareTriangleUniformAmounts(presentationTriangle([], {}), 'cash')).toBeNull()
    expect(fareTriangleUniformAmounts(presentationTriangle(['A'], {}), 'cash')).toBeNull()
  })
})

function resolveSingleCell({ routePattern, data }: { routePattern: GtfsStop[]; data: FareV1Data }): FareTriangleCell {
  const triangle = buildFareTriangle({
    axis: axisForPattern('source-a', routePattern),
    constructedRoutes: [constructedRoute('source-a', 'route', 0, [routePattern])],
    fareDataBySource: { 'source-a': data },
    sourceNameMap: { 'source-a': 'Source A' },
    stopMap: {},
  })
  return cell(triangle.cells, 0, 1)
}

function cell(cells: Record<string, FareTriangleCell>, originIndex: number, destinationIndex: number): FareTriangleCell {
  const value = cells[fareTriangleCellKey(originIndex, destinationIndex)]
  if (!value) {
    throw new Error('Expected fare triangle cell')
  }
  return value
}

function axisForPattern(sourceId: string, routePattern: GtfsStop[]): FareTriangleAxisEntry[] {
  return [
    axisEntry(routePattern[0]?.name ?? '', [poleStop(sourceId, routePattern, 0)]),
    axisEntry(routePattern.at(-1)?.name ?? '', [poleStop(sourceId, routePattern, routePattern.length - 1)]),
  ]
}

function axisEntry(displayName: string, stops: ProPoleStop[]): FareTriangleAxisEntry {
  return {
    key: displayName,
    displayName,
    poleIds: [`pole-${displayName}`],
    stops,
  }
}

function constructedRoute(sourceId: string, routeId: string, direction: number | null, stopPatterns: GtfsStop[][]): ProConstructedRoute {
  return {
    sourceId,
    sourceName: sourceId,
    route: { routeId, shortName: routeId, longName: null },
    direction,
    stopPatterns,
  }
}

function pattern(...stopIds: string[]): GtfsStop[] {
  return stopIds.map((stopId, index) => ({ ...stop(stopId, stopId.toUpperCase()), stopSequence: index + 1 }))
}

function pole(
  poleId: string,
  sourceId: string,
  routePattern: GtfsStop[],
  stopIndex: number,
  nameOverride: string | null = null,
): ProPoleDetail {
  return {
    id: poleId,
    stops: [poleStop(sourceId, routePattern, stopIndex)],
    override: { ...EMPTY_OVERRIDE, nameOverride },
  }
}

function emptyPole(id: string): ProPoleDetail {
  return { id, stops: [], override: EMPTY_OVERRIDE }
}

function poleStop(sourceId: string, routePattern: GtfsStop[], stopIndex: number): ProPoleStop {
  const routeStop = routePattern[stopIndex]
  if (!routeStop) {
    throw new Error('Expected route stop')
  }
  return {
    sourceId,
    id: routeStop.stopId,
    stopSequence: routeStop.stopSequence ?? null,
    stopPatternKey: stopPatternKey(routePattern),
    stopIndex,
  }
}

function stop(stopId: string, name: string): GtfsStop {
  return { stopId, name, platformCode: null }
}

function fareData(overrides: Partial<FareV1Data>): FareV1Data {
  return {
    fareAttributesPresent: true,
    fareRulesPresent: true,
    stopZoneById: {},
    routeAgencyById: {},
    attributes: [],
    rules: [],
    ...overrides,
  }
}

function attribute(fareId: string, price: number, overrides: Partial<Omit<FareV1Attribute, 'fareId' | 'price'>> = {}): FareV1Attribute {
  return {
    fareId,
    price,
    icPrice: price,
    currencyType: 'JPY',
    agencyId: null,
    ...overrides,
  }
}

function rule(fareId: string, overrides: Partial<Omit<FareV1Rule, 'fareId'>> = {}): FareV1Rule {
  return {
    fareId,
    routeId: null,
    originId: null,
    destinationId: null,
    containsId: null,
    ...overrides,
  }
}

function fares(cashPrice: number, icPrice = cashPrice): FareTriangleCandidate[] {
  return [fareCandidate(cashPrice, icPrice)]
}

function fareCandidate(cashPrice: number, icPrice = cashPrice, overrides: Partial<FareTriangleCandidate> = {}): FareTriangleCandidate {
  return {
    sourceId: 'source-a',
    sourceName: 'Source A',
    routeId: 'route',
    routeName: 'Route',
    direction: 0,
    fareId: `${cashPrice}-${icPrice}`,
    cashPrice,
    icPrice,
    currency: 'JPY',
    icFallback: false,
    boardStopId: 'board',
    boardName: 'Board',
    boardZone: 'board-zone',
    alightStopId: 'alight',
    alightName: 'Alight',
    alightZone: 'alight-zone',
    ...overrides,
  }
}

function presentationTriangle(axisNames: string[], candidatesByCell: Record<string, FareTriangleCandidate[]>): FareTriangle {
  const cells: Record<string, FareTriangleCell> = {}
  for (let destinationIndex = 1; destinationIndex < axisNames.length; destinationIndex += 1) {
    for (let originIndex = 0; originIndex < destinationIndex; originIndex += 1) {
      const key = fareTriangleCellKey(originIndex, destinationIndex)
      cells[key] = {
        originIndex,
        destinationIndex,
        candidates: candidatesByCell[key] ?? [],
      }
    }
  }
  return {
    axis: axisNames.map((name) => axisEntry(name, [])),
    cells,
    warnings: [],
    missingZoneCount: 0,
    unsupportedContainsRuleCount: 0,
  }
}
