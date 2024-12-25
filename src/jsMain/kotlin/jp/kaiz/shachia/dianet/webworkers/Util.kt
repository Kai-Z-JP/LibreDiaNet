package jp.kaiz.shachia.dianet.webworkers

import org.w3c.dom.MessageEvent
import org.w3c.dom.Worker
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine

class WorkerException(message: String) : Throwable(message)

suspend fun Worker.send(data: String) = suspendCoroutine<MessageEvent> { continuation ->
    this.onmessage = { messageEvent ->
        continuation.resume(messageEvent)
    }
    this.onerror = { event -> continuation.resumeWithException(WorkerException(event.type)) }
    this.postMessage(data)
}