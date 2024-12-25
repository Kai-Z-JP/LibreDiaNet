package jp.kaiz.shachia.dianet

import io.ktor.client.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.serialization.kotlinx.json.*
import jp.kaiz.shachia.dianet.dsl.routing
import jp.kaiz.shachia.dianet.pages.FallBack
import jp.kaiz.shachia.dianet.pages.Index
import react.dom.client.createRoot
import web.dom.document

fun main() {
    val routing = routing {
        route("/") {
            page(Index)
        }
        fallback(FallBack)
    }

    createRoot(document.getElementById("root")!!).render(routing.createRouterProvider())
}

val client = HttpClient {
    install(ContentNegotiation) {
        json(kotlinxJson)
    }
}