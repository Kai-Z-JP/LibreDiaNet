package jp.kaiz.shachia.dianet.dsl

import js.objects.jso
import react.FC
import react.Props
import react.create
import react.router.RouteObject
import react.router.RouterProvider
import react.router.dom.createBrowserRouter

data class Routing(
    val routes: Array<RouteObject>,
) {
    fun createBrowserRouter() = createBrowserRouter(routes)

    fun createRouterProvider() = RouterProvider.create { this.router = createBrowserRouter() }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other == null || this::class.js != other::class.js) return false

        other as Routing

        return routes contentEquals other.routes
    }

    override fun hashCode() = routes.contentHashCode()
}

class RoutingBuilder {
    val routes = mutableListOf<RouteObject>()

    fun page(element: FC<Props>) = page(null, true, element)

    fun page(path: String, element: FC<Props>) = page(path, null, element)

    fun fallback(element: FC<Props>) = page("*", null, element)

    private fun page(path: String? = null, index: Boolean? = null, element: FC<Props>) {
        val route: RouteObject = jso {
            this.path = path
            this.index = index
            this.element = element.create()
        }

        this.routes += route
    }

    fun route(path: String, block: RoutingBuilder.() -> Unit) {
        val builder = RoutingBuilder()
        builder.block()

        val route: RouteObject = jso {
            this.path = path
            this.children = builder.routes.toTypedArray()
        }

        this.routes += route
    }
}

fun routing(block: RoutingBuilder.() -> Unit): Routing {
    val builder = RoutingBuilder()
    builder.block()
    return Routing(builder.routes.toTypedArray())
}