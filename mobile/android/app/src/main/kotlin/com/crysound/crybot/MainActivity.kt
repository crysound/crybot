package com.crysound.crybot

import android.Manifest
import android.app.Activity
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.DownloadListener
import android.webkit.JsResult
import android.webkit.PermissionRequest
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import java.util.Locale

class MainActivity : Activity() {
    private lateinit var container: ViewGroup
    private lateinit var webView: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var pendingPermissionRequest: PermissionRequest? = null
    private var pendingPermissionResources: Array<String> = emptyArray()
    private var pendingDownload: DownloadManager.Request? = null
    private var currentServer: String = ""
    private val preferences by lazy { getSharedPreferences("crybot", MODE_PRIVATE) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_FULLSCREEN
        container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.WHITE)
        }
        setContentView(container)
        currentServer = BuildConfig.CRYBOT_SERVER_URL.ifBlank { preferences.getString("server", "") ?: "" }
        if (validServer(currentServer)) showWebView() else showServerForm()
    }

    private fun showServerForm() {
        container.removeAllViews()
        val form = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 96, 48, 48)
        }
        val title = TextView(this).apply {
            text = getString(com.crysound.crybot.R.string.server_address_title)
            textSize = 24f
            setTextColor(Color.rgb(23, 0, 87))
        }
        val input = EditText(this).apply {
            hint = getString(com.crysound.crybot.R.string.server_address_hint)
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_URI
            setSingleLine(true)
            setText(currentServer)
        }
        val message = TextView(this).apply { setTextColor(Color.RED) }
        val save = Button(this).apply { text = getString(com.crysound.crybot.R.string.server_address_save) }
        save.setOnClickListener {
            val value = input.text.toString().trim().trimEnd('/')
            if (!validServer(value)) {
                message.text = getString(com.crysound.crybot.R.string.server_address_invalid)
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

    private fun showError() {
        container.removeAllViews()
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 96, 48, 48)
        }
        val text = TextView(this).apply {
            text = getString(R.string.load_error)
            textSize = 20f
        }
        val retry = Button(this).apply { text = getString(R.string.retry) }
        retry.setOnClickListener { showWebView() }
        val change = Button(this).apply { text = getString(R.string.change_server) }
        change.setOnClickListener { showServerForm() }
        layout.addView(text, LinearLayout.LayoutParams(-1, -2))
        layout.addView(retry, LinearLayout.LayoutParams(-1, -2).apply { topMargin = 24 })
        layout.addView(change, LinearLayout.LayoutParams(-1, -2))
        container.addView(layout, LinearLayout.LayoutParams(-1, -1))
    }

    private fun showWebView() {
        container.removeAllViews()
        webView = WebView(this)
        container.addView(webView, LinearLayout.LayoutParams(-1, -1))
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = true
        settings.userAgentString = "${settings.userAgentString} CryBotApp/${BuildConfig.VERSION_NAME} Android"
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (!request.isForMainFrame) return false
                return navigate(request.url)
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) showError()
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                return try {
                    startActivityForResult(params.createIntent(), FILE_CHOOSER_REQUEST)
                    true
                } catch (_: ActivityNotFoundException) {
                    fileCallback = null
                    false
                }
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                val permissions = mutableListOf<String>()
                if (request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) permissions += Manifest.permission.RECORD_AUDIO
                if (request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) permissions += Manifest.permission.CAMERA
                val missing = permissions.filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
                if (missing.isEmpty()) request.grant(request.resources)
                else {
                    pendingPermissionRequest = request
                    pendingPermissionResources = request.resources
                    requestPermissions(missing.toTypedArray(), MEDIA_PERMISSION_REQUEST)
                }
            }
        }
        webView.setDownloadListener(DownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
            val request = DownloadManager.Request(Uri.parse(url)).apply {
                setMimeType(mimeType)
                setTitle(URLUtil.guessFileName(url, contentDisposition, mimeType))
                setDescription(url)
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, URLUtil.guessFileName(url, contentDisposition, mimeType))
                addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url) ?: "")
                addRequestHeader("User-Agent", userAgent)
            }
            enqueueDownload(request)
            Toast.makeText(this, getString(R.string.download_started), Toast.LENGTH_SHORT).show()
        })
        webView.loadUrl(currentServer)
    }

    private fun navigate(uri: Uri): Boolean {
        val scheme = uri.scheme?.lowercase(Locale.US)
        if (scheme == "http" || scheme == "https") {
            if (allowedHost(uri.host)) return false
            openExternal(uri)
            return true
        }
        openExternal(uri)
        return true
    }

    private fun openExternal(uri: Uri) {
        try {
            val intent = if (uri.scheme == "intent") Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME) else Intent(Intent.ACTION_VIEW, uri)
            startActivity(intent)
        } catch (_: Exception) {
        }
    }

    private fun allowedHost(host: String?): Boolean {
        if (host.isNullOrBlank()) return false
        val serverHost = Uri.parse(currentServer).host ?: return false
        if (host.equals(serverHost, true)) return true
        return BuildConfig.CRYBOT_LOGIN_HOSTS.split(',').map { it.trim().lowercase(Locale.US) }.any { it.isNotEmpty() && host.lowercase(Locale.US) == it }
    }

    private fun validServer(value: String): Boolean {
        val uri = runCatching { Uri.parse(value) }.getOrNull() ?: return false
        return (uri.scheme == "http" || uri.scheme == "https") && !uri.host.isNullOrBlank()
    }

    private fun enqueueDownload(request: DownloadManager.Request) {
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            pendingDownload = request
            requestPermissions(arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE), DOWNLOAD_PERMISSION_REQUEST)
        } else {
            (getSystemService(DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
        }
    }

    override fun onPause() {
        CookieManager.getInstance().flush()
        super.onPause()
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_REQUEST) {
            fileCallback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data))
            fileCallback = null
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == MEDIA_PERMISSION_REQUEST) {
            val request = pendingPermissionRequest ?: return
            if (grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) request.grant(pendingPermissionResources) else request.deny()
            pendingPermissionRequest = null
        }
        if (requestCode == DOWNLOAD_PERMISSION_REQUEST) {
            val download = pendingDownload
            pendingDownload = null
            if (download != null && grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) enqueueDownload(download)
        }
    }

    companion object {
        private const val FILE_CHOOSER_REQUEST = 1001
        private const val MEDIA_PERMISSION_REQUEST = 1002
        private const val DOWNLOAD_PERMISSION_REQUEST = 1003
    }
}
