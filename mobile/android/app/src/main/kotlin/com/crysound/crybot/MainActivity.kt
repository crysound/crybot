package com.crysound.crybot

import android.Manifest
import android.app.Activity
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.Message
import android.util.Base64
import android.view.ViewGroup
import android.view.WindowInsets
import android.webkit.CookieManager
import android.webkit.DownloadListener
import android.webkit.MimeTypeMap
import android.webkit.PermissionRequest
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import java.util.Locale
import java.security.SecureRandom
import org.json.JSONObject

class MainActivity : Activity() {
    private lateinit var container: ViewGroup
    private lateinit var webView: WebView
    private var webViewVisible = false
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var pendingPermissionRequest: PermissionRequest? = null
    private var pendingPermissionResources: Array<String> = emptyArray()
    private var pendingDownload: DownloadManager.Request? = null
    private var currentServer: String = ""
    private var serverWasInjected = false
    private var completingLogin = false
    private val preferences by lazy { getSharedPreferences("crybot", MODE_PRIVATE) }
    private val configuredServer get() = BuildConfig.CRYBOT_SERVER_URL.trim().trimEnd('/')
    private val loginHosts = BuildConfig.CRYBOT_LOGIN_HOSTS.split(',').map { it.trim().lowercase(Locale.US) }.filter { it.isNotEmpty() }.toSet()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(23, 0, 87))
            setOnApplyWindowInsetsListener { view, insets ->
                val left: Int
                val top: Int
                val right: Int
                val bottom: Int
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    val values = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.ime())
                    left = values.left
                    top = values.top
                    right = values.right
                    bottom = values.bottom
                } else {
                    @Suppress("DEPRECATION")
                    left = insets.systemWindowInsetLeft
                    @Suppress("DEPRECATION")
                    top = insets.systemWindowInsetTop
                    @Suppress("DEPRECATION")
                    right = insets.systemWindowInsetRight
                    @Suppress("DEPRECATION")
                    bottom = insets.systemWindowInsetBottom
                }
                view.setPadding(left, top, right, bottom)
                insets
            }
        }
        setContentView(container)
        container.requestApplyInsets()
        serverWasInjected = validServer(configuredServer)
        currentServer = if (serverWasInjected) configuredServer else preferences.getString("server", "") ?: ""
        if (!handleAuthCallback(intent?.data)) {
            if (validServer(currentServer)) {
                if (loginHosts.isNotEmpty() && preferences.contains("login_state")) showError(login = true) else showWebView()
            } else showServerForm()
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleAuthCallback(intent.data)
    }

    private fun showServerForm() {
        if (loginHosts.isNotEmpty()) clearPendingLogin()
        webViewVisible = false
        container.removeAllViews()
        val form = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.WHITE)
            setPadding(48, 96, 48, 48)
        }
        val title = TextView(this).apply {
            text = getString(R.string.server_address_title)
            textSize = 24f
            setTextColor(Color.rgb(23, 0, 87))
        }
        val input = EditText(this).apply {
            hint = getString(R.string.server_address_hint)
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_URI
            setSingleLine(true)
            setText(currentServer)
        }
        val message = TextView(this).apply { setTextColor(Color.RED) }
        val save = Button(this).apply { text = getString(R.string.server_address_save) }
        save.setOnClickListener {
            val value = input.text.toString().trim().trimEnd('/')
            if (!validServer(value)) {
                message.text = getString(R.string.server_address_invalid)
            } else {
                currentServer = value
                preferences.edit().putString("server", value).apply()
                showWebView()
            }
        }
        form.addView(title, LinearLayout.LayoutParams(-1, -2))
        form.addView(input, LinearLayout.LayoutParams(-1, -2).apply { topMargin = 28 })
        form.addView(message, LinearLayout.LayoutParams(-1, -2))
        form.addView(save, LinearLayout.LayoutParams(-1, -2).apply { topMargin = 18 })
        container.addView(form, LinearLayout.LayoutParams(-1, -1))
    }

    private fun showError(login: Boolean = false) {
        webViewVisible = false
        container.removeAllViews()
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.WHITE)
            setPadding(48, 96, 48, 48)
        }
        val label = TextView(this).apply {
            text = getString(if (login) R.string.login_error else R.string.load_error)
            textSize = 20f
        }
        val retry = Button(this).apply { text = getString(if (login) R.string.login else R.string.retry) }
        retry.setOnClickListener { if (login) startLogin(retry = true) else showWebView() }
        layout.addView(label, LinearLayout.LayoutParams(-1, -2))
        layout.addView(retry, LinearLayout.LayoutParams(-1, -2).apply { topMargin = 24 })
        if (!serverWasInjected) {
            val change = Button(this).apply { text = getString(R.string.change_server) }
            change.setOnClickListener { showServerForm() }
            layout.addView(change, LinearLayout.LayoutParams(-1, -2))
        }
        container.addView(layout, LinearLayout.LayoutParams(-1, -1))
    }

    private fun showWebView() {
        if (!::webView.isInitialized) createWebView()
        webViewVisible = true
        container.removeAllViews()
        container.addView(webView, LinearLayout.LayoutParams(-1, -1))
        webView.loadUrl(currentServer)
    }

    private fun createWebView() {
        webView = WebView(this)
        webView.setBackgroundColor(Color.WHITE)
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = true
        if (loginHosts.isNotEmpty()) settings.setSupportMultipleWindows(true)
        settings.userAgentString = "${settings.userAgentString} CryBotApp/${BuildConfig.VERSION_NAME} Android"
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (!request.isForMainFrame) return false
                return navigate(request.url)
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame && !completingLogin && (loginHosts.isEmpty() || !preferences.contains("login_state"))) showError()
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onCreateWindow(view: WebView, isDialog: Boolean, isUserGesture: Boolean, resultMsg: Message): Boolean {
                if (loginHosts.isEmpty()) return false
                val popup = WebView(this@MainActivity)
                popup.webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                        if (!request.isForMainFrame) return false
                        if (!navigate(request.url)) webView.loadUrl(request.url.toString())
                        view.post { view.destroy() }
                        return true
                    }
                }
                (resultMsg.obj as WebView.WebViewTransport).webView = popup
                resultMsg.sendToTarget()
                return true
            }

            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "*/*"
                    val mimeTypes = params.acceptTypes.flatMap { accept ->
                        accept.split(',').map { it.trim().lowercase(Locale.US) }.filter { it.isNotEmpty() }.mapNotNull { type ->
                            if (type.startsWith(".")) MimeTypeMap.getSingleton().getMimeTypeFromExtension(type.removePrefix(".")) else type.takeIf { it.contains('/') }
                        }
                    }.distinct()
                    if (mimeTypes.isNotEmpty()) putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes.toTypedArray())
                    if (params.mode == FileChooserParams.MODE_OPEN_MULTIPLE) putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                }
                return try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST)
                    true
                } catch (e: ActivityNotFoundException) {
                    fileCallback?.onReceiveValue(null)
                    fileCallback = null
                    true
                }
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                pendingPermissionRequest?.deny()
                pendingPermissionRequest = null
                pendingPermissionResources = emptyArray()
                if (!allowedHost(request.origin.host)) {
                    request.deny()
                    return
                }
                val resources = request.resources.filter {
                    it == PermissionRequest.RESOURCE_AUDIO_CAPTURE || it == PermissionRequest.RESOURCE_VIDEO_CAPTURE
                }.toTypedArray()
                if (resources.isEmpty()) {
                    request.deny()
                    return
                }
                val permissions = resources.map {
                    if (it == PermissionRequest.RESOURCE_AUDIO_CAPTURE) Manifest.permission.RECORD_AUDIO else Manifest.permission.CAMERA
                }
                val missing = permissions.distinct().filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
                if (missing.isEmpty()) request.grant(resources)
                else {
                    pendingPermissionRequest = request
                    pendingPermissionResources = resources
                    requestPermissions(missing.toTypedArray(), MEDIA_PERMISSION_REQUEST)
                }
            }
        }
        webView.setDownloadListener(DownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
            val scheme = Uri.parse(url).scheme?.lowercase(Locale.US)
            if (scheme != "http" && scheme != "https") {
                Toast.makeText(this, getString(R.string.download_unsupported), Toast.LENGTH_SHORT).show()
                return@DownloadListener
            }
            val filename = URLUtil.guessFileName(url, contentDisposition, mimeType)
            try {
                val request = DownloadManager.Request(Uri.parse(url))
                request.setMimeType(mimeType)
                request.setTitle(filename)
                request.setDescription(url)
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                try {
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename)
                } catch (e: RuntimeException) {
                    Toast.makeText(this@MainActivity, getString(R.string.download_failed), Toast.LENGTH_SHORT).show()
                    return@DownloadListener
                }
                request.addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url) ?: "")
                request.addRequestHeader("User-Agent", userAgent)
                if (enqueueDownload(request)) {
                    Toast.makeText(this, getString(R.string.download_started), Toast.LENGTH_SHORT).show()
                }
            } catch (e: RuntimeException) {
                Toast.makeText(this, getString(R.string.download_failed), Toast.LENGTH_SHORT).show()
                return@DownloadListener
            }
        })
    }

    private fun navigate(uri: Uri): Boolean {
        val scheme = uri.scheme?.lowercase(Locale.US)
        if (scheme == "http" || scheme == "https") {
            if (isLoginHost(uri.host)) {
                startLogin()
                return true
            }
            if (allowedHost(uri.host)) return false
            openExternal(uri)
            return true
        }
        openExternal(uri)
        return true
    }

    private fun openExternal(uri: Uri) {
        try {
            val intent = if (uri.scheme.equals("intent", true)) {
                Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME).apply {
                    addCategory(Intent.CATEGORY_BROWSABLE)
                    component = null
                    selector = null
                }
            } else Intent(Intent.ACTION_VIEW, uri)
            startActivity(intent)
        } catch (e: Exception) {
            // System handlers may not support an identity-source app link.
        }
    }

    private fun allowedHost(host: String?): Boolean {
        if (host.isNullOrBlank()) return false
        val serverHost = Uri.parse(currentServer).host ?: return false
        if (host.equals(serverHost, true)) return true
        return loginHosts.contains(host.lowercase(Locale.US))
    }

    private fun isLoginHost(host: String?): Boolean {
        return host != null && !host.equals(Uri.parse(currentServer).host, true) && loginHosts.contains(host.lowercase(Locale.US))
    }

    private fun startLogin(retry: Boolean = false) {
        if (loginHosts.isEmpty() || completingLogin || (!retry && preferences.contains("login_state"))) return
        val bytes = ByteArray(32)
        SecureRandom().nextBytes(bytes)
        val state = Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
        if (!preferences.edit().putString("login_state", state).putString("login_server", currentServer).commit()) {
            clearPendingLogin()
            showError(login = true)
            return
        }
        val handoff = Uri.parse(currentServer).buildUpon().path("/auth/app-handoff").clearQuery().fragment(null).appendQueryParameter("state", state).build()
        showError(login = true)
        try {
            startActivity(Intent(Intent.ACTION_VIEW, handoff).addCategory(Intent.CATEGORY_BROWSABLE))
        } catch (e: ActivityNotFoundException) {
            clearPendingLogin()
            showError(login = true)
        }
    }

    private fun clearPendingLogin(): Boolean {
        return preferences.edit().remove("login_state").remove("login_server").commit()
    }

    private fun handleAuthCallback(uri: Uri?): Boolean {
        if (uri == null || !uri.isHierarchical || uri.scheme != "crybot" || uri.host != "auth" || loginHosts.isEmpty()) return false
        val state = preferences.getString("login_state", null) ?: return false
        if (uri.getQueryParameters("state") != listOf(state) || preferences.getString("login_server", null) != currentServer) return false
        if (!clearPendingLogin()) {
            showError(login = true)
            return true
        }
        val token = uri.getQueryParameters("token").singleOrNull()
        val maxAge = token?.let { tokenMaxAge(it) }
        if (token == null || maxAge == null || !validServer(currentServer)) {
            showError(login = true)
            return true
        }
        completingLogin = true
        if (!::webView.isInitialized) createWebView()
        val server = currentServer
        val cookies = CookieManager.getInstance()
        cookies.setCookie(server, "CF_Authorization=$token; Path=/; Secure; HttpOnly; Max-Age=$maxAge") { accepted ->
            cookies.flush()
            completingLogin = false
            if (accepted && currentServer == server) showWebView() else showError(login = true)
        }
        return true
    }

    private fun tokenMaxAge(token: String): Long? {
        if (!Regex("^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$").matches(token)) return null
        return runCatching {
            val payload = Base64.decode(token.split('.')[1], Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
            val exp = JSONObject(String(payload, Charsets.UTF_8)).get("exp") as? Number ?: return null
            val seconds = exp.toDouble() - System.currentTimeMillis() / 1000.0
            if (!seconds.isFinite() || seconds < 1 || seconds >= Long.MAX_VALUE.toDouble()) null else seconds.toLong()
        }.getOrNull()
    }

    private fun validServer(value: String): Boolean {
        val uri = runCatching { Uri.parse(value) }.getOrNull() ?: return false
        return uri.scheme.equals("https", true) && !uri.host.isNullOrBlank()
    }

    private fun enqueueDownload(request: DownloadManager.Request): Boolean {
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            pendingDownload = request
            requestPermissions(arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE), DOWNLOAD_PERMISSION_REQUEST)
            return false
        } else {
            try {
                (getSystemService(DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
                return true
            } catch (e: RuntimeException) {
                Toast.makeText(this, getString(R.string.download_failed), Toast.LENGTH_SHORT).show()
                return false
            }
        }
    }

    override fun onPause() {
        CookieManager.getInstance().flush()
        super.onPause()
    }

    override fun onBackPressed() {
        if (webViewVisible && ::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != FILE_CHOOSER_REQUEST) return
        val callback = fileCallback ?: return
        fileCallback = null
        if (resultCode != RESULT_OK || data == null) {
            callback.onReceiveValue(null)
            return
        }
        val uris = mutableListOf<Uri>()
        data.data?.let(uris::add)
        data.clipData?.let { clip ->
            for (index in 0 until clip.itemCount) clip.getItemAt(index).uri?.let(uris::add)
        }
        callback.onReceiveValue(uris.distinct().toTypedArray().takeIf { it.isNotEmpty() })
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == MEDIA_PERMISSION_REQUEST) {
            val request = pendingPermissionRequest
            pendingPermissionRequest = null
            if (request != null) {
                if (grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) request.grant(pendingPermissionResources) else request.deny()
            }
            pendingPermissionResources = emptyArray()
        }
        if (requestCode == DOWNLOAD_PERMISSION_REQUEST) {
            val download = pendingDownload
            pendingDownload = null
            if (download != null) {
                if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) {
                    if (enqueueDownload(download)) Toast.makeText(this, getString(R.string.download_started), Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, getString(R.string.download_failed), Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    companion object {
        private const val FILE_CHOOSER_REQUEST = 1001
        private const val MEDIA_PERMISSION_REQUEST = 1002
        private const val DOWNLOAD_PERMISSION_REQUEST = 1003
    }
}
