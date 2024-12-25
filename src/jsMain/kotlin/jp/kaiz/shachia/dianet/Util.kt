package jp.kaiz.shachia.dianet

import kotlinx.browser.document
import web.blob.Blob
import web.url.URL

infix fun <T> Set<T>?.xor(other: Set<T>): Set<T> = if (this == null) other else (this - other) + (other - this)

fun ByteArray.downloadAsFile(fileName: String) {
    val blob = Blob(arrayOf(this))
    val url = URL.createObjectURL(blob)

    val a = document.createElement("a") as org.w3c.dom.HTMLAnchorElement
    a.href = url
    a.download = fileName
    a.style.display = "none"

    document.body?.appendChild(a)

    a.click()

    document.body?.removeChild(a)

    URL.revokeObjectURL(url)
}