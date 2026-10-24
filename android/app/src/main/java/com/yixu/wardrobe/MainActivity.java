package com.yixu.wardrobe;

import android.app.Activity;
import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Iterator;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + HOST + "/index.html";
    private static final int PICK_FILE = 101, SAVE_FILE = 102;
    private final ExecutorService io = Executors.newFixedThreadPool(2);
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private Uri cameraUri;
    private byte[] pendingExport;
    private String exportRequestId;
    private volatile boolean trustedPage;

    @SuppressLint("SetJavaScriptEnabled") // Required by the packaged React UI; CSP, navigation and bridge hosts are restricted.
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(247, 246, 242));
        getWindow().setNavigationBarColor(Color.rgb(247, 246, 242));
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(247, 246, 242));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(247, 246, 242));
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        // Target 36 enforces edge-to-edge. Keep app controls clear of both system bars and IME.
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else { view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom()); }
            return insets;
        });
        setContentView(root);
        android.content.pm.PackageInfo webPackage = WebView.getCurrentWebViewPackage();
        if (webPackage != null) {
            try {
                int major = Integer.parseInt(webPackage.versionName.split("\\.")[0]);
                if (major < 111) {
                    new AlertDialog.Builder(this).setTitle("请先更新系统网页组件")
                        .setMessage("衣序需要 Android System WebView 或 Chrome 111 及以上版本。更新系统网页组件后，即可重新打开衣橱。")
                        .setCancelable(false).setPositiveButton("知道了", (dialog, which) -> finish()).show();
                    return;
                }
            } catch (NumberFormatException ignored) { }
        }
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // System photo chooser content URIs only.
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        web.addJavascriptInterface(new NativeBridge(), "YixuNative");
        web.setWebViewClient(new WebViewClient() {
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                trustedPage = url.startsWith("https://" + HOST + "/");
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && HOST.equals(uri.getHost())) return false;
                // Never navigate the bridge-enabled WebView to third-party pages.
                if ("https".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
                }
                return true;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!HOST.equals(uri.getHost())) return null;
                String path = uri.getPath();
                if (path == null || path.equals("/")) path = "/index.html";
                if (!path.matches("/[a-zA-Z0-9_./-]+") || path.contains("..") || !"GET".equals(request.getMethod())) return missing();
                try {
                    String ext = MimeTypeMap.getFileExtensionFromUrl(path);
                    String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
                    if (ext.equals("js")) mime = "application/javascript";
                    if (ext.equals("svg")) mime = "image/svg+xml";
                    if (mime == null) mime = "application/octet-stream";
                    HashMap<String,String> headers = new HashMap<>();
                    headers.put("X-Content-Type-Options", "nosniff");
                    return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers, getAssets().open("www" + path));
                } catch (Exception e) { return missing(); }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                cameraUri = null;
                String accept = String.join(",", params.getAcceptTypes());
                boolean image = accept.contains("image");
                Intent document = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(image ? "image/*" : "application/json");
                if (image) {
                    Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                    cameraUri = Uri.parse("content://com.yixu.wardrobe.photos/capture.jpg");
                    camera.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
                    camera.setClipData(ClipData.newRawUri("photo", cameraUri));
                    camera.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    if (camera.resolveActivity(getPackageManager()) != null) {
                        if (params.isCaptureEnabled()) document = camera;
                        else {
                            Intent chooser = Intent.createChooser(document, "选择衣物或个人照片");
                            chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
                            document = chooser;
                        }
                    } else cameraUri = null;
                }
                try { startActivityForResult(document, PICK_FILE); } catch (Exception e) { fileCallback.onReceiveValue(null); fileCallback = null; }
                return true;
            }
            @Override public boolean onJsAlert(WebView view, String url, String message, android.webkit.JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("知道了", (d, w) -> result.confirm()).setOnCancelListener(d -> result.cancel()).show();
                return true;
            }
        });
        web.loadUrl(HOME);
        if (android.os.Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
    }
    private WebResourceResponse missing() { return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", new HashMap<>(), new ByteArrayInputStream(new byte[0])); }

    private void deliver(String id, String value, String error) {
        runOnUiThread(() -> {
            if (isFinishing() || isDestroyed()) return;
            web.evaluateJavascript("window.yixuNativeResult?.(" + JSONObject.quote(id) + "," + JSONObject.quote(value) + "," + JSONObject.quote(error) + ")", null);
        });
    }
    private class NativeBridge {
        @JavascriptInterface public void saveFile(String name, String mime, String base64, String id) {
            if (!trustedPage) return;
            io.execute(() -> {
                try {
                    if (base64.length() > 165_000_000 || !(mime.equals("application/json") || mime.equals("image/jpeg"))) throw new Exception("导出文件格式或大小不受支持");
                    byte[] data = Base64.decode(base64, Base64.DEFAULT);
                    runOnUiThread(() -> {
                        if (pendingExport != null) { deliver(id, "", "请先完成上一次文件保存"); return; }
                        pendingExport = data; exportRequestId = id;
                        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(mime);
                        intent.putExtra(Intent.EXTRA_TITLE, name.replaceAll("[\\\\/:*?\"<>|]", "_"));
                        try { startActivityForResult(intent, SAVE_FILE); } catch (Exception e) { pendingExport = null; exportRequestId = null; deliver(id, "", "无法打开系统文件保存器"); }
                    });
                } catch (Exception e) { deliver(id, "", "无法准备导出文件"); }
            });
        }
        @JavascriptInterface public void request(String json, String id) {
            if (!trustedPage) return;
            io.execute(() -> {
                HttpURLConnection connection = null;
                try {
                    JSONObject input = new JSONObject(json);
                    URI uri = new URI(input.getString("url"));
                    String host = uri.getHost();
                    if (!"https".equals(uri.getScheme()) || host == null ||
                        !(host.equals("dashscope.aliyuncs.com") || host.matches("[a-zA-Z0-9-]+\\.cn-beijing\\.maas\\.aliyuncs\\.com")) ||
                        !uri.getPath().startsWith("/api/v1/") || (uri.getPort() != -1 && uri.getPort() != 443)) throw new Exception("不支持的云服务地址");
                    connection = (HttpURLConnection) new URL(uri.toString()).openConnection();
                    connection.setInstanceFollowRedirects(false);
                    connection.setConnectTimeout(20000); connection.setReadTimeout(60000);
                    String method = input.optString("method", "GET");
                    if (!method.equals("GET") && !method.equals("POST")) throw new Exception("不支持的请求方式");
                    connection.setRequestMethod(method);
                    JSONObject headers = input.optJSONObject("headers");
                    if (headers != null) {
                        Iterator<String> keys = headers.keys();
                        while (keys.hasNext()) { String key = keys.next(); if (key.equalsIgnoreCase("Authorization") || key.equalsIgnoreCase("Content-Type") || key.equalsIgnoreCase("X-DashScope-Async")) connection.setRequestProperty(key, headers.getString(key)); }
                    }
                    if (method.equals("POST")) {
                        byte[] data = input.optString("body", "").getBytes(StandardCharsets.UTF_8);
                        if (data.length > 20_000_000) throw new Exception("照片太大，请压缩后重试");
                        connection.setDoOutput(true); connection.setFixedLengthStreamingMode(data.length);
                        try (OutputStream stream = connection.getOutputStream()) { stream.write(data); }
                    }
                    int status = connection.getResponseCode();
                    InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
                    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                    if (stream != null) try (InputStream body = stream) {
                        byte[] buffer = new byte[8192]; int count;
                        while ((count = body.read(buffer)) != -1) { bytes.write(buffer, 0, count); if (bytes.size() > 2_000_000) throw new Exception("服务响应过大"); }
                    }
                    JSONObject output = new JSONObject().put("status", status).put("body", bytes.toString("UTF-8"));
                    deliver(id, output.toString(), "");
                } catch (Exception e) { deliver(id, "", "云服务网络请求失败，请检查网络与服务地址"); }
                finally { if (connection != null) connection.disconnect(); }
            });
        }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PICK_FILE && fileCallback != null) {
            Uri[] uris = null;
            if (result == RESULT_OK) {
                Uri selected = data != null ? data.getData() : null;
                if (selected == null) selected = cameraUri;
                if (selected != null) uris = new Uri[]{selected};
            }
            fileCallback.onReceiveValue(uris); fileCallback = null; cameraUri = null;
        }
        if (request == SAVE_FILE && pendingExport != null) {
            final byte[] bytes = pendingExport; final String id = exportRequestId;
            pendingExport = null; exportRequestId = null;
            if (result != RESULT_OK || data == null || data.getData() == null) { deliver(id, "", "已取消保存"); return; }
            final Uri destination = data.getData();
            io.execute(() -> {
                try (OutputStream stream = getContentResolver().openOutputStream(destination)) {
                    if (stream == null) throw new Exception();
                    stream.write(bytes); stream.flush(); deliver(id, "saved", "");
                } catch (Exception e) { deliver(id, "", "文件保存失败，请检查存储空间"); }
            });
        }
    }
    @SuppressLint("GestureBackNavigation") // Legacy API 26-32 only. API 33+ registers OnBackInvokedDispatcher above.
    @Override public void onBackPressed() {
        handleBack();
    }
    private void handleBack() {
        web.evaluateJavascript("Boolean(window.yixuHandleBack && window.yixuHandleBack())", handled -> {
            if (!"true".equals(handled)) new AlertDialog.Builder(this).setTitle("暂时离开衣序？").setMessage("衣橱数据已经保存在此设备。").setNegativeButton("继续整理", null).setPositiveButton("离开", (d, w) -> finish()).show();
        });
    }
    @Override protected void onDestroy() { if (fileCallback != null) fileCallback.onReceiveValue(null); trustedPage = false; if (web != null) web.destroy(); io.shutdownNow(); super.onDestroy(); }
}
