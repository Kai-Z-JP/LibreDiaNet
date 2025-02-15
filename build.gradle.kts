@file:OptIn(ExperimentalDistributionDsl::class)

import io.ktor.plugin.features.*
import kotlinx.html.*
import kotlinx.html.dom.createHTMLDocument
import kotlinx.html.dom.serialize
import org.jetbrains.kotlin.gradle.targets.js.dsl.ExperimentalDistributionDsl
import org.jetbrains.kotlin.gradle.targets.js.webpack.KotlinWebpack
import org.jetbrains.kotlin.gradle.targets.js.webpack.KotlinWebpackConfig

plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.serialization)
    alias(libs.plugins.ktor)
    application
}

group = "jp.kaiz.shachia"
version = "0.0.1"

buildscript {
    repositories {
        mavenCentral()
    }
    dependencies {
        classpath(libs.kotlinx.html)
    }
}

val ktorVersion = extra["ktor.version"] as String
fun ktor(target: String) = "io.ktor:ktor-$target:$ktorVersion"
fun ktorSv(target: String) = ktor("server-$target")
fun ktorCl(target: String) = ktor("client-$target")

application {
    mainClass = "jp.kaiz.shachia.dianet.DiaNetApplicationKt"
}

val mainClassStr by extra("io.ktor.server.netty.EngineMain")

kotlin {
    jvm {
        withJava()
    }
    js {
        binaries.executable()
        browser {
            commonWebpackConfig {
                cssSupport {
                    enabled.set(true)
                }
                this.mode = KotlinWebpackConfig.Mode.DEVELOPMENT
                this.devServer = KotlinWebpackConfig.DevServer(
                    port = 8080,
                    static = mutableListOf(
                        "$buildDir/processedResources/js/main",
                        "$buildDir/kotlin-webpack/worker/worker"
                    ),
                    proxy = mutableListOf(
                        KotlinWebpackConfig.DevServer.Proxy(
                            context = mutableListOf("/api"),
                            target = "http://127.0.0.1:9090"
                        )
                    )
                )
            }
        }
    }
    sourceSets {
        val commonMain by getting {
            dependencies {
                implementation("jp.kaiz:shachia-gtfs:0.0.3")
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
                implementation(ktorSv("forwarded-header"))

                implementation(ktorCl("cio"))
                implementation(ktorCl("content-negotiation"))

                implementation("ch.qos.logback:logback-classic:1.5.6")
                implementation("org.slf4j:slf4j-api:2.0.13")

                implementation("jp.kaiz:shachia-poi-dsl:0.0.1")
            }
        }

        val jsMain by getting {
            dependencies {
                implementation(ktorCl("js"))
                implementation(ktorCl("content-negotiation"))

                implementation(kotlinWrappers.react)
                implementation(kotlinWrappers.reactDom)
                implementation(kotlinWrappers.reactRouterDom)
                implementation(kotlinWrappers.reactBeautifulDnd)

                implementation(kotlinWrappers.emotion)
                implementation(kotlinWrappers.mui.material)
                implementation(kotlinWrappers.mui.iconsMaterial)
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

tasks.named("processResources") {
    dependsOn("createSPAHtml")
}

task("createSPAHtml") {
    File(project.projectDir, "src/commonMain/resources/index.html").writeText(
        createHTMLDocument().html {
            lang = "ja"
            head {
                meta(charset = "utf-8")
                title("Index | LibreDiaNet")
                meta(
                    name = "viewport",
                    content = "width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no"
                )
                link(
                    rel = "stylesheet",
                    href = "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@100..900&display=swap"
                )
            }
            body {
                div {
                    id = "root"
                }
                script(src = "/${project.name}.js") { }
            }
        }.serialize(true)
    )
}

tasks.wrapper {
    gradleVersion = "8.7"
}

tasks.named<Copy>("jvmProcessResources") {
    val jsBrowserDistribution = tasks.named("jsBrowserDistribution")
    from(jsBrowserDistribution)
}

tasks.named<JavaExec>("run") {
    environment("IP_ADDR", "127.0.0.1")
    dependsOn(tasks.named<Jar>("jvmJar"))
    classpath(tasks.named<Jar>("jvmJar"))
}

tasks.named("jsProductionExecutableCompileSync") {
    dependsOn(tasks.named("jsBrowserDevelopmentWebpack"))
}

tasks.getByName<Jar>("jvmJar") {
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE

    val taskName =
        if (project.hasProperty("isProduction") || project.gradle.startParameter.taskNames.contains("installDist")) {
            "jsBrowserProductionWebpack"
        } else {
            "jsBrowserDevelopmentWebpack"
        }
    val webpackTask = tasks.getByName<KotlinWebpack>(taskName)
    dependsOn(webpackTask)
    from(File(webpackTask.destinationDirectory, webpackTask.outputFileName))
}

tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
}
