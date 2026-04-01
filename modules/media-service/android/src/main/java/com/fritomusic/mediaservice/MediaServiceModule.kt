package com.fritomusic.mediaservice

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.palette.graphics.Palette
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class MediaServiceModule : Module() {

    companion object {
        private const val TAG = "FritoMediaModule"
    }

    private var service: MusicPlaybackService? = null
    private var isBound = false
    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    private data class PendingMetadata(
        val title: String,
        val artist: String,
        val album: String,
        val durationMs: Long,
        val trackUri: String?
    )
    private var pendingMetadata: PendingMetadata? = null
    private var pendingPlaybackState: Pair<Boolean, Long>? = null

    private val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
            Log.d(TAG, "onServiceConnected")
            val localBinder = binder as MusicPlaybackService.LocalBinder
            service = localBinder.getService()
            isBound = true

            service?.setCallback(object : MusicPlaybackService.MediaServiceCallback {
                override fun onPlay() {
                    Log.d(TAG, "callback onPlay -> sendEvent")
                    sendEvent("onRemotePlay", emptyMap<String, Any>())
                }
                override fun onPause() {
                    Log.d(TAG, "callback onPause -> sendEvent")
                    sendEvent("onRemotePause", emptyMap<String, Any>())
                }
                override fun onNext() {
                    Log.d(TAG, "callback onNext -> sendEvent")
                    sendEvent("onRemoteNext", emptyMap<String, Any>())
                }
                override fun onPrevious() {
                    Log.d(TAG, "callback onPrevious -> sendEvent")
                    sendEvent("onRemotePrevious", emptyMap<String, Any>())
                }
                override fun onSeekTo(positionMs: Long) {
                    Log.d(TAG, "callback onSeekTo -> sendEvent: $positionMs")
                    sendEvent("onRemoteSeek", mapOf("position" to positionMs))
                }
                override fun onStop() {
                    Log.d(TAG, "callback onStop -> sendEvent")
                    sendEvent("onRemoteStop", emptyMap<String, Any>())
                }
            })

            pendingMetadata?.let { meta ->
                Log.d(TAG, "applying pending metadata: ${meta.title}")
                service?.updateMetadata(meta.title, meta.artist, meta.album, meta.durationMs, meta.trackUri)
                service?.startForegroundService()
                pendingMetadata = null
            }
            pendingPlaybackState?.let { (playing, pos) ->
                Log.d(TAG, "applying pending playback state: playing=$playing")
                service?.updatePlaybackState(playing, pos)
                pendingPlaybackState = null
            }

            service?.drainPendingActions()
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            Log.d(TAG, "onServiceDisconnected")
            service = null
            isBound = false
        }
    }

    override fun definition() = ModuleDefinition {
        Name("MediaServiceModule")

        Events(
            "onRemotePlay",
            "onRemotePause",
            "onRemoteNext",
            "onRemotePrevious",
            "onRemoteSeek",
            "onRemoteStop"
        )

        AsyncFunction("startService") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            val intent = Intent(context, MusicPlaybackService::class.java)
            context.startForegroundService(intent)
            context.bindService(intent, connection, Context.BIND_AUTO_CREATE)
            Log.d(TAG, "startService called")
            true
        }

        AsyncFunction("stopService") {
            val context = appContext.reactContext ?: return@AsyncFunction false
            if (isBound) {
                try { context.unbindService(connection) } catch (_: Exception) {}
                isBound = false
            }
            val intent = Intent(context, MusicPlaybackService::class.java)
            context.stopService(intent)
            service = null
            true
        }

        AsyncFunction("updateMetadata") { title: String, artist: String, album: String, durationMs: Double, trackUri: String? ->
            val svc = service
            if (svc != null) {
                svc.updateMetadata(title, artist, album, durationMs.toLong(), trackUri)
                svc.startForegroundService()
            } else {
                Log.d(TAG, "service null, queuing metadata")
                pendingMetadata = PendingMetadata(title, artist, album, durationMs.toLong(), trackUri)
            }
            true
        }

        AsyncFunction("updatePlaybackState") { playing: Boolean, positionMs: Double ->
            val svc = service
            if (svc != null) {
                svc.updatePlaybackState(playing, positionMs.toLong())
            } else {
                pendingPlaybackState = Pair(playing, positionMs.toLong())
            }
            true
        }

        AsyncFunction("extractPalette") { trackUri: String ->
            val context = appContext.reactContext ?: return@AsyncFunction emptyMap<String, String>()
            extractColorsFromTrack(context, trackUri)
        }

        AsyncFunction("extractPaletteFromBase64") { base64Data: String ->
            extractColorsFromBase64(base64Data)
        }

        OnDestroy {
            val context = appContext.reactContext
            if (isBound && context != null) {
                try { context.unbindService(connection) } catch (_: Exception) {}
                isBound = false
            }
            executor.shutdown()
        }
    }

    private fun extractColorsFromTrack(context: Context, trackUri: String): Map<String, String> {
        return try {
            val retriever = MediaMetadataRetriever()
            try {
                retriever.setDataSource(context, Uri.parse(trackUri))
                val bytes = retriever.embeddedPicture ?: return emptyMap()
                val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return emptyMap()
                extractColorsFromBitmap(bitmap)
            } finally {
                try { retriever.release() } catch (_: Exception) {}
            }
        } catch (_: Exception) {
            emptyMap()
        }
    }

    private fun extractColorsFromBase64(base64Data: String): Map<String, String> {
        return try {
            val cleanData = base64Data.substringAfter("base64,", base64Data)
            val bytes = android.util.Base64.decode(cleanData, android.util.Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return emptyMap()
            extractColorsFromBitmap(bitmap)
        } catch (_: Exception) {
            emptyMap()
        }
    }

    private fun extractColorsFromBitmap(bitmap: Bitmap): Map<String, String> {
        return try {
            val palette = Palette.from(bitmap).maximumColorCount(24).generate()
            val result = mutableMapOf<String, String>()

            palette.dominantSwatch?.let { result["dominant"] = colorToHex(it.rgb) }
            palette.vibrantSwatch?.let { result["vibrant"] = colorToHex(it.rgb) }
            palette.mutedSwatch?.let { result["muted"] = colorToHex(it.rgb) }
            palette.darkVibrantSwatch?.let { result["darkVibrant"] = colorToHex(it.rgb) }
            palette.darkMutedSwatch?.let { result["darkMuted"] = colorToHex(it.rgb) }
            palette.lightVibrantSwatch?.let { result["lightVibrant"] = colorToHex(it.rgb) }

            if (!result.containsKey("dominant")) {
                palette.swatches.maxByOrNull { it.population }?.let {
                    result["dominant"] = colorToHex(it.rgb)
                }
            }

            bitmap.recycle()
            result
        } catch (_: Exception) {
            emptyMap()
        }
    }

    private fun colorToHex(color: Int): String {
        val r = (color shr 16) and 0xFF
        val g = (color shr 8) and 0xFF
        val b = color and 0xFF
        return String.format("#%02X%02X%02X", r, g, b)
    }
}
