package jp.kaiz.shachia.dianet

import kotlinx.datetime.LocalDate
import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerializationException
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonEncoder
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.encodeToJsonElement
import kotlinx.serialization.json.jsonPrimitive

@Serializable(with = DayMappingSerializer::class)
sealed interface DayMapping {
    val name: String
}

data class DateDayMapping(
    override val name: String,
    val date: LocalDate,
) : DayMapping

data class WeekdayDayMapping(
    override val name: String,
    val weekday: GtfsServiceWeekday,
) : DayMapping

enum class GtfsServiceWeekday {
    MONDAY,
    TUESDAY,
    WEDNESDAY,
    THURSDAY,
    FRIDAY,
    SATURDAY,
    SUNDAY
}

object DayMappingListSerializer : KSerializer<List<DayMapping>> {
    override val descriptor: SerialDescriptor =
        ListSerializer(DayMappingSerializer).descriptor

    override fun deserialize(decoder: Decoder): List<DayMapping> {
        val jsonDecoder = decoder as? JsonDecoder
            ?: throw SerializationException("DayMappingListSerializer supports only JSON")
        val element = jsonDecoder.decodeJsonElement()
        return jsonDecoder.json.decodeFromJsonElement(ListSerializer(DayMappingSerializer), element)
    }

    override fun serialize(encoder: Encoder, value: List<DayMapping>) {
        val jsonEncoder = encoder as? JsonEncoder
            ?: throw SerializationException("DayMappingListSerializer supports only JSON")
        val element = jsonEncoder.json.encodeToJsonElement(ListSerializer(DayMappingSerializer), value)
        jsonEncoder.encodeJsonElement(element)
    }
}

object DayMappingSerializer : KSerializer<DayMapping> {
    override val descriptor: SerialDescriptor =
        JsonElement.serializer().descriptor

    override fun deserialize(decoder: Decoder): DayMapping {
        val jsonDecoder = decoder as? JsonDecoder
            ?: throw SerializationException("DayMappingSerializer supports only JSON")
        return decodeElement(jsonDecoder.decodeJsonElement())
    }

    override fun serialize(encoder: Encoder, value: DayMapping) {
        val jsonEncoder = encoder as? JsonEncoder
            ?: throw SerializationException("DayMappingSerializer supports only JSON")
        val element = when (value) {
            is DateDayMapping -> buildJsonObject {
                put("name", JsonPrimitive(value.name))
                put("type", JsonPrimitive("date"))
                put("date", JsonPrimitive(value.date.toString()))
            }
            is WeekdayDayMapping -> buildJsonObject {
                put("name", JsonPrimitive(value.name))
                put("type", JsonPrimitive("weekday"))
                put("weekday", JsonPrimitive(value.weekday.serialValue()))
            }
        }
        jsonEncoder.encodeJsonElement(element)
    }

    private fun decodeElement(element: JsonElement): DayMapping =
        when (element) {
            is JsonArray -> decodeArray(element)
            is JsonObject -> decodeObject(element)
            else -> throw SerializationException("dayMapping entry must be an array or object")
        }

    private fun decodeArray(element: JsonArray): DayMapping {
        if (element.size != 2) {
            throw SerializationException("dayMapping entry array must have exactly 2 elements")
        }
        val name = element[0].jsonPrimitive.content
        val date = LocalDate.parse(element[1].jsonPrimitive.content)
        return DateDayMapping(name, date)
    }

    private fun decodeObject(element: JsonObject): DayMapping {
        val name = element["name"] ?: element["first"]
        if (name == null) {
            throw SerializationException("dayMapping entry object must contain name")
        }

        val type = element["type"]?.jsonPrimitive?.content
        val date = element["date"] ?: element["second"]
        val weekday = element["weekday"]
        if (type == "weekday" || weekday != null) {
            if (weekday == null) {
                throw SerializationException("weekday dayMapping entry must contain weekday")
            }
            return WeekdayDayMapping(name.jsonPrimitive.content, parseGtfsServiceWeekday(weekday.jsonPrimitive.content))
        }
        if (date == null) {
            throw SerializationException("date dayMapping entry must contain date or second")
        }
        return DateDayMapping(name.jsonPrimitive.content, LocalDate.parse(date.jsonPrimitive.content))
    }
}

private fun GtfsServiceWeekday.serialValue(): String =
    name.lowercase()

private fun parseGtfsServiceWeekday(value: String): GtfsServiceWeekday =
    GtfsServiceWeekday.values().find { it.serialValue() == value }
        ?: throw SerializationException("unsupported weekday: $value")
