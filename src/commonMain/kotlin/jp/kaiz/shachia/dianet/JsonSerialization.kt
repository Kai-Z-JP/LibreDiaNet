package jp.kaiz.shachia.dianet

import kotlinx.serialization.json.Json
import kotlinx.serialization.modules.SerializersModule
import kotlinx.serialization.modules.polymorphic
import kotlinx.serialization.modules.subclass

val kotlinxJson = Json {
    ignoreUnknownKeys = true
    serializersModule = SerializersModule {
        polymorphic(GTFSDateSource::class) {
            subclass(GTFSDataSourceRepo::class)
            subclass(GTFSRawSource::class)
        }
        polymorphic(GTFSInformation::class) {
            subclass(DataRepoGtfsInformation::class)
            subclass(RawGtfsInformation::class)
        }
    }
}