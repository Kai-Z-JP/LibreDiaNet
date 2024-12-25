pluginManagement {
    resolutionStrategy {
        plugins {
            val kotlinVersion = extra["kotlin.version"] as String

            kotlin("multiplatform") version kotlinVersion
            kotlin("plugin.serialization") version kotlinVersion
        }
    }
}

dependencyResolutionManagement {
    repositories {
        mavenCentral()
        mavenLocal()
        maven("https://maven.pkg.jetbrains.space/public/p/kotlinx-html/maven")
    }

    versionCatalogs {
        create("kotlinWrappers") {
            val wrappersVersion = extra["kotlin.wrappers.version"] as String
            from("org.jetbrains.kotlin-wrappers:kotlin-wrappers-catalog:$wrappersVersion")
        }
    }
}