package jp.kaiz.shachia.dianet

import io.ktor.client.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.cio.*
import io.ktor.server.http.content.*
import io.ktor.server.plugins.calllogging.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.plugins.forwardedheaders.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import jp.kaiz.shachia.dianet.api.poiParser
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation as ClientContentNegotiation

fun main(args: Array<String>): Unit = EngineMain.main(args)

val client = HttpClient {
    install(ClientContentNegotiation) {
        json(kotlinxJson)
    }
}

fun Application.module() {
    install(ContentNegotiation) {
        json(kotlinxJson)
    }
    install(CORS) {
        allowHeader(HttpHeaders.ContentType)
        allowMethod(HttpMethod.Options)
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Delete)
    }
    install(CallLogging)
    install(ForwardedHeaders)
    install(XForwardedHeaders)

    routing {
        route("/api") {
            route("/poi_parser") {
                poiParser()
            }
        }

        get("/") {
            call.respondText(
                this.javaClass.classLoader.getResource("index.html")!!.readText(),
                ContentType.Text.Html
            )
        }

        staticResources("/", "")
    }
}