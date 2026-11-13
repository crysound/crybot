import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

fun configured(name: String): String =
    (project.findProperty(name) as String?)?.takeIf { it.isNotBlank() }
        ?: System.getenv(name)?.takeIf { it.isNotBlank() }
        ?: ""

val serverUrl = configured("CRYBOT_SERVER_URL")
val loginHosts = configured("CRYBOT_LOGIN_HOSTS")
val versionCodeValue = configured("CRYBOT_VERSION_CODE").toIntOrNull() ?: 1
val versionNameValue = configured("CRYBOT_VERSION_NAME").ifBlank { "0.1.0" }

android {
    namespace = "com.crysound.crybot"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.crysound.crybot"
        minSdk = 26
        targetSdk = 35
        versionCode = versionCodeValue
        versionName = versionNameValue
        buildConfigField("String", "CRYBOT_SERVER_URL", "\"${serverUrl.replace("\\", "\\\\").replace("\"", "\\\"")}\"")
        buildConfigField("String", "CRYBOT_LOGIN_HOSTS", "\"${loginHosts.replace("\\", "\\\\").replace("\"", "\\\"")}\"")
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    signingConfigs {
        val keystore = configured("CRYBOT_ANDROID_KEYSTORE")
        val storePassword = configured("CRYBOT_ANDROID_KEYSTORE_PASSWORD")
        val alias = configured("CRYBOT_ANDROID_KEY_ALIAS")
        val keyPassword = configured("CRYBOT_ANDROID_KEY_PASSWORD")
        if (keystore.isNotBlank() && storePassword.isNotBlank() && alias.isNotBlank() && keyPassword.isNotBlank()) {
            create("releaseEnv") {
                storeFile = file(keystore)
                this.storePassword = storePassword
                keyAlias = alias
                this.keyPassword = keyPassword
            }
        }
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            signingConfig = signingConfigs.findByName("releaseEnv")
        }
    }
}
