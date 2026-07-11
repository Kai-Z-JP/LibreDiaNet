package jp.kaiz.shachia.dianet

import kotlinx.serialization.Serializable

@Serializable
data class DiaNetXlsxCreateFromDataRequest(
    val gtfs: DiaNetGtfsExportData,
    val preset: RoutePreset,
    @Serializable(with = DayMappingListSerializer::class)
    val dayMapping: List<DayMapping>
)

@Serializable
data class DiaNetGtfsExportData(
    val agencyName: String,
    val stops: List<DiaNetStopData>,
    val routes: List<DiaNetRouteData>,
    val trips: List<DiaNetTripData>,
    val stopTimes: List<DiaNetStopTimeData>,
    val calendars: List<DiaNetCalendarData>
)

@Serializable
data class DiaNetStopData(
    val id: String,
    val name: String,
    val platformCode: String? = null,
    val jokoOverride: String? = null
)

@Serializable
data class DiaNetRouteData(
    val id: String,
    val shortName: String? = null,
    val longName: String? = null
)

@Serializable
data class DiaNetTripData(
    val tripId: String,
    val routeId: String,
    val directionId: Int? = null,
    val serviceId: String,
    val tripHeadsign: String? = null
)

@Serializable
data class DiaNetStopTimeData(
    val tripId: String,
    val stopId: String,
    val stopSequence: Int,
    val arrivalTime: String? = null,
    val departureTime: String? = null,
    val stopPatternId: String? = null
)

@Serializable
data class DiaNetCalendarData(
    val id: String,
    val startDate: String,
    val endDate: String,
    val sunday: Int,
    val monday: Int,
    val tuesday: Int,
    val wednesday: Int,
    val thursday: Int,
    val friday: Int,
    val saturday: Int
)
