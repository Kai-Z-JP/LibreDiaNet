import io.ktor.plugin.features.*
import org.gradle.api.tasks.Exec
import org.gradle.api.tasks.Sync
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.serialization)
    alias(libs.plugins.ktor)
    application
}

group = "jp.kaiz.shachia"
version = "0.0.2"

val ktorVersion = extra["ktor.version"] as String
fun ktor(target: String) = "io.ktor:ktor-$target:$ktorVersion"
fun ktorSv(target: String) = ktor("server-$target")
fun ktorCl(target: String) = ktor("client-$target")

application {
    mainClass = "jp.kaiz.shachia.dianet.DiaNetApplicationKt"
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

kotlin {
    jvmToolchain(21)
    jvm {
        withJava()
        compilerOptions {
            jvmTarget.set(JvmTarget.JVM_21)
        }
    }
    sourceSets {
        val commonMain by getting {
            dependencies {
                implementation("jp.kaiz:shachia-gtfs:0.0.4")
                implementation(ktor("serialization-kotlinx-json"))
                implementation("app.softwork:kotlinx-uuid-core:0.0.22")
                implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.6.1")
            }
        }
        val jvmMain by getting {
            dependencies {
                implementation(ktorSv("cio"))
                implementation(ktorSv("content-negotiation"))
                implementation(ktorSv("cors"))
                implementation(ktorSv("call-logging"))
                implementation(ktorSv("default-headers"))
                implementation(ktorSv("forwarded-header"))

                implementation(ktorCl("cio"))
                implementation(ktorCl("content-negotiation"))

                implementation("ch.qos.logback:logback-classic:1.5.6")
                implementation("org.slf4j:slf4j-api:2.0.13")

                implementation("jp.kaiz:shachia-poi-dsl:0.0.1")
            }
        }
    }
}

ktor {
    docker {
        localImageName = "libre-dianet-app"
        jreVersion = JavaVersion.VERSION_21
        portMappings = listOf(
            DockerPortMapping(
                9090,
                9090,
                DockerPortMappingProtocol.TCP
            )
        )
        externalRegistry = DockerImageRegistry.dockerHub(
            appName = provider { "libre-dianet-app" },
            username = providers.environmentVariable("DOCKER_HUB_USERNAME"),
            password = providers.environmentVariable("DOCKER_HUB_PASSWORD")
        )
    }
}

val frontendDir = layout.projectDirectory.dir("frontend")
val frontendNodeModules = frontendDir.dir("node_modules")
val frontendDist = frontendDir.dir("dist")

val frontendInstall by tasks.registering(Exec::class) {
    workingDir(frontendDir.asFile)
    commandLine("pnpm", "install", "--frozen-lockfile")
    inputs.files(
        frontendDir.file("package.json"),
        frontendDir.file("pnpm-lock.yaml")
    )
    outputs.dir(frontendNodeModules)
}

val frontendBuild by tasks.registering(Exec::class) {
    dependsOn(frontendInstall)
    workingDir(frontendDir.asFile)
    commandLine("pnpm", "build")
    inputs.files(
        frontendDir.file("package.json"),
        frontendDir.file("pnpm-lock.yaml"),
        frontendDir.file("tsconfig.json"),
        frontendDir.file("tsconfig.app.json"),
        frontendDir.file("vite.config.ts"),
        frontendDir.file("index.html")
    )
    inputs.dir(frontendDir.dir("src"))
    inputs.dir(frontendDir.dir("public"))
    outputs.dir(frontendDist)
}

val syncFrontendDist by tasks.registering(Sync::class) {
    dependsOn(frontendBuild)
    from(frontendDist)
    into(layout.buildDirectory.dir("generated/frontend"))
}

tasks.wrapper {
    gradleVersion = "8.7"
}

tasks.named<Copy>("jvmProcessResources") {
    dependsOn(syncFrontendDist)
    from(syncFrontendDist) {
        into("frontend")
    }
}

tasks.named<JavaExec>("run") {
    environment("IP_ADDR", "127.0.0.1")
    dependsOn(tasks.named<Jar>("jvmJar"))
    classpath(tasks.named<Jar>("jvmJar"))
}

tasks.getByName<Jar>("jvmJar") {
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    dependsOn(syncFrontendDist)
}

tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
}
