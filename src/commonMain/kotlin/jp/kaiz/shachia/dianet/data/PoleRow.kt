package jp.kaiz.shachia.dianet.data

data class PoleRow(var name: String?, var joko: String, var locationName: String)

fun List<PoleRow>.joko(index: Int): String {
    val current = this[index]
    val prev = this.getOrNull(index - 1)

    val joko = when {
        prev == null -> "発"
        prev.joko == current.joko -> "〃"
        else -> current.joko
    }

    return joko
}

fun List<PoleRow>.name(index: Int): Pair<String?, Int?> {
    val current = this[index]
    val name = current.name ?: return null to null

    val samePoleRows = this.drop(index + 1)
        .takeWhile { it.name == name }

    samePoleRows.forEach { it.name = null }

    val rowSpan = samePoleRows.count() + 1

    return name to rowSpan
}