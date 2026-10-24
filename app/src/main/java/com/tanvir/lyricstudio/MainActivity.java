package com.tanvir.lyricstudio;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {

    private static final int FILE_REQUEST = 1001;
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);

        webView.addJavascriptInterface(new SaveBridge(), "AndroidSave");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view,
                                             ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;

                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES,
                        new String[]{"audio/*", "video/*", "image/*"});
                try {
                    startActivityForResult(intent, FILE_REQUEST);
                } catch (Exception e) {
                    filePathCallback = null;
                    callback.onReceiveValue(null);
                    return false;
                }
                return true;
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.deny();
            }
        });

        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_REQUEST && filePathCallback != null) {
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                result = new Uri[]{data.getData()};
            }
            filePathCallback.onReceiveValue(result);
            filePathCallback = null;
        }
    }

    private void toast(final String msg) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show();
            }
        });
    }

    // এই সেতুটি দিয়ে ওয়েব পাতা থেকে ফোনে ফাইল সেভ হয়
    private class SaveBridge {
        private final Map<String, OutputStream> streams = new HashMap<>();
        private final Map<String, Uri> uris = new HashMap<>();
        private int counter = 0;

        @JavascriptInterface
        public synchronized String begin(String fileName, String mime) {
            try {
                String id = "s" + (++counter);
                OutputStream os;
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                    v.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                    v.put(MediaStore.MediaColumns.RELATIVE_PATH,
                            Environment.DIRECTORY_DOWNLOADS + "/LyricStudio");
                    v.put(MediaStore.MediaColumns.IS_PENDING, 1);
                    Uri uri = getContentResolver()
                            .insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                    if (uri == null) return "";
                    os = getContentResolver().openOutputStream(uri);
                    uris.put(id, uri);
                } else {
                    File dir = new File(
                            getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS),
                            "LyricStudio");
                    dir.mkdirs();
                    os = new FileOutputStream(new File(dir, fileName));
                }
                if (os == null) return "";
                streams.put(id, os);
                return id;
            } catch (Exception e) {
                toast("সেভ শুরু করা যায়নি");
                return "";
            }
        }

        @JavascriptInterface
        public synchronized boolean chunk(String id, String base64Data) {
            try {
                OutputStream os = streams.get(id);
                if (os == null) return false;
                os.write(Base64.decode(base64Data, Base64.DEFAULT));
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public synchronized boolean finish(String id) {
            try {
                OutputStream os = streams.remove(id);
                if (os == null) return false;
                os.flush();
                os.close();
                Uri uri = uris.remove(id);
                if (uri != null && Build.VERSION.SDK_INT >= 29) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.MediaColumns.IS_PENDING, 0);
                    getContentResolver().update(uri, v, null, null);
                }
                toast("সেভ হয়েছে: Downloads/LyricStudio ফোল্ডারে");
                return true;
            } catch (Exception e) {
                toast("সেভ করতে সমস্যা হয়েছে");
                return false;
            }
        }
    }
                      }
