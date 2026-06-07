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
import io.ktor.server.plugins.defaultheaders.*
import io.ktor.server.plugins.forwardedheaders.*
import io.ktor.server.request.*
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

private fun frontendResource(path: String): String =
    DiaNetApplication::class.java.classLoader.getResource(path)!!.readText()

private object DiaNetApplication

private suspend fun ApplicationCall.respondFrontend(path: String) {
    respondText(
        frontendResource(path),
        ContentType.Text.Html
    )
}

fun Application.module() {
    install(ContentNegotiation) {
        json(kotlinxJson)
    }
    install(DefaultHeaders) {
        header("Cross-Origin-Opener-Policy", "same-origin")
        header("Cross-Origin-Embedder-Policy", "require-corp")
    }
    install(CORS) {
        allowHost("127.0.0.1:5173")
        allowHost("localhost:5173")
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
            val indexPath =
                if (call.request.queryParameters["experimental"] == "true") {
                    "react/index.html"
                } else {
                    "frontend/index.html"
                }
            call.respondFrontend(indexPath)
        }
        get("/pro") {
            call.respondFrontend("react/index.html")
        }
        get("/pro/{...}") {
            call.respondFrontend("react/index.html")
        }
        staticResources("/react", "react")
        staticResources("/", "frontend")
        get("/{...}") {
            call.respondFrontend("frontend/index.html")
        }
    }
}
