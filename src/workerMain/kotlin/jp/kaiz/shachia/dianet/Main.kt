package jp.kaiz.shachia.dianet

import jp.kaiz.shachia.dianet.webworkers.*
import jp.kaiz.shachia.gtfs.GTFS
import jp.kaiz.shachia.gtfs.io.zip.ZipUtils
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import org.w3c.dom.DedicatedWorkerGlobalScope
import org.w3c.dom.url.URLSearchParams

fun worker(block: WorkerScope.() -> Unit) {
    val isWorkerGlobalScope = js("typeof(WorkerGlobalScope) !== \"undefined\"") as? Boolean
        ?: throw IllegalStateException("Boolean cast went wrong")
    if (!isWorkerGlobalScope) return

    val self = js("self") as? DedicatedWorkerGlobalScope
        ?: throw IllegalStateException("DedicatedWorkerGlobalScope cast went wrong")
    val scope = WorkerScope(self)
    block(scope)
}

class WorkerScope(private val self: DedicatedWorkerGlobalScope) {
    val workerId = URLSearchParams(self.location.search).get("id") ?: "Unknown worker"

    @OptIn(DelicateCoroutinesApi::class)
    fun receive(block: suspend (String) -> String) {
        self.onmessage = { messageEvent ->
            GlobalScope.launch {
                self.postMessage(block(messageEvent.data.toString()))
            }
        }
    }

    fun receiveRequest(block: suspend (request: Request<*>) -> RequestResult) = receive { data ->
        val message = kotlinxJson.decodeFromString<Message>(data)
        val response = try {
            val result = block(message as Request<*>)
            Response(workerId = workerId, result = result, error = null)
        } catch (e: Throwable) {
            Response(workerId = workerId, result = null, error = e.message)
        }
        kotlinxJson.encodeToString(response)
    }
}

fun main() = worker {
    receiveRequest { request ->
        when (request) {
            is GtfsUnZip -> {
                val zipEntries = ZipUtils.extractZip(request.byteArray)
                val gtfs = GTFS.readFromZip(zipEntries)
                GtfsUnZipResult(gtfs)
            }

            else -> throw Exception("Unhandled request")
        }
    }
}