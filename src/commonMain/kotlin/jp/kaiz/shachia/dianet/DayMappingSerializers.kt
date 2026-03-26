package jp.kaiz.shachia.dianet

import kotlinx.datetime.LocalDate
import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerializationException
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
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.encodeToJsonElement
import kotlinx.serialization.json.jsonPrimitive

object DayMappingListSerializer : KSerializer<List<Pair<String, LocalDate>>> {
    override val descriptor: SerialDescriptor =
        ListSerializer(DayMappingTupleSerializer).descriptor

    override fun deserialize(decoder: Decoder): List<Pair<String, LocalDate>> {
        val jsonDecoder = decoder as? JsonDecoder
            ?: throw SerializationException("DayMappingListSerializer supports only JSON")
        val element = jsonDecoder.decodeJsonElement()
        return jsonDecoder.json.decodeFromJsonElement(ListSerializer(DayMappingTupleSerializer), element)
    }

    override fun serialize(encoder: Encoder, value: List<Pair<String, LocalDate>>) {
        val jsonEncoder = encoder as? JsonEncoder
            ?: throw SerializationException("DayMappingListSerializer supports only JSON")
        val element = jsonEncoder.json.encodeToJsonElement(ListSerializer(DayMappingTupleSerializer), value)
        jsonEncoder.encodeJsonElement(element)
    }
}

private object DayMappingTupleSerializer : KSerializer<Pair<String, LocalDate>> {
    override val descriptor: SerialDescriptor =
        JsonElement.serializer().descriptor

    override fun deserialize(decoder: Decoder): Pair<String, LocalDate> {
        val jsonDecoder = decoder as? JsonDecoder
            ?: throw SerializationException("DayMappingTupleSerializer supports only JSON")
        return decodeElement(jsonDecoder.decodeJsonElement())
    }

    override fun serialize(encoder: Encoder, value: Pair<String, LocalDate>) {
        val jsonEncoder = encoder as? JsonEncoder
            ?: throw SerializationException("DayMappingTupleSerializer supports only JSON")
        jsonEncoder.encodeJsonElement(
            buildJsonArray {
                add(JsonPrimitive(value.first))
                add(JsonPrimitive(value.second.toString()))
            }
        )
    }

    private fun decodeElement(element: JsonElement): Pair<String, LocalDate> =
        when (element) {
            is JsonArray -> decodeArray(element)
            is JsonObject -> decodeObject(element)
            else -> throw SerializationException("dayMapping entry must be an array or object")
        }

    private fun decodeArray(element: JsonArray): Pair<String, LocalDate> {
        if (element.size != 2) {
            throw SerializationException("dayMapping entry array must have exactly 2 elements")
        }
        val name = element[0].jsonPrimitive.content
        val date = LocalDate.parse(element[1].jsonPrimitive.content)
        return name to date
    }

    private fun decodeObject(element: JsonObject): Pair<String, LocalDate> {
        val name = element["name"] ?: element["first"]
        val date = element["date"] ?: element["second"]
        if (name == null || date == null) {
            throw SerializationException("dayMapping entry object must contain name/date or first/second")
        }
        return name.jsonPrimitive.content to LocalDate.parse(date.jsonPrimitive.content)
    }
}
