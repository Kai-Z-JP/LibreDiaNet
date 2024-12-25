package jp.kaiz.shachia.dianet.data

import io.ktor.client.call.*
import io.ktor.client.request.*
import jp.kaiz.shachia.dianet.client
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import react.StateInstance
import react.useEffectWithCleanup
import react.useState


inline fun <reified R : Any> useData(url: String?, crossinline onFetch: (R) -> Unit = {}): StateInstance<R?> {
    val stateInstance = useState<R>()
    val (_, setData) = stateInstance
    useEffectWithCleanup(url) {
        if (url.isNullOrEmpty()) {
            setData { null }
            return@useEffectWithCleanup
        }
        var ignore = false
        MainScope().launch {
            val res: R = client.get(url).body()
            if (ignore) return@launch
            setData { res }
            onFetch(res)
        }
        onCleanup {
            ignore = true
        }
    }
    return stateInstance
}

inline fun <reified R : Any> useListData(url: String?): StateInstance<List<R>> {
    val stateInstance = useState<List<R>>(listOf())
    val (_, setData) = stateInstance
    useEffectWithCleanup(url) {
        var ignore = false
        if (url.isNullOrEmpty()) {
            setData { listOf() }
            return@useEffectWithCleanup
        }
        MainScope().launch {
            val res: List<R> = client.get(url).body()
            if (ignore) return@launch
            setData { res }
        }
        onCleanup {
            ignore = true
        }
    }
    return stateInstance
}