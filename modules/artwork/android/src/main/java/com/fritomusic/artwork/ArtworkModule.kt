package com.fritomusic.artwork

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.util.Base64
import android.util.LruCache
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream
import java.util.concurrent.LinkedBlockingQueue

class ArtworkModule : Module() {

    companion object {
        private const val POOL_SIZE = 3
        private const val CACHE_SIZE = 50
        private const val MAX_BITMAP_SIZE = 512
    }

    private val retrieverPool = LinkedBlockingQueue<MediaMetadataRetriever>(POOL_SIZE).apply {
        repeat(POOL_SIZE) { offer(MediaMetadataRetriever()) }
    }

    private val artworkCache = object : LruCache<String, String>(CACHE_SIZE) {}

    private fun <T> withRetriever(block: (MediaMetadataRetriever) -> T): T {
        val retriever = retrieverPool.poll() ?: MediaMetadataRetriever()
        return try {
            block(retriever)
        } finally {
            try {
                retriever.release()
            } catch (_: Exception) {}
            val fresh = MediaMetadataRetriever()
            retrieverPool.offer(fresh)
        }
    }

    private fun extractArtwork(uri: String, maxSize: Int): String? {
        val cached = artworkCache.get(uri)
        if (cached != null) return cached

        return withRetriever { retriever ->
            try {
                val context = appContext.reactContext ?: return@withRetriever null
                retriever.setDataSource(context, Uri.parse(uri))
                val artBytes = retriever.embeddedPicture ?: return@withRetriever null

                val opts = BitmapFactory.Options().apply {
                    inJustDecodeBounds = true
                }
                BitmapFactory.decodeByteArray(artBytes, 0, artBytes.size, opts)

                val sampleSize = calculateSampleSize(opts.outWidth, opts.outHeight, maxSize)
                val decodeOpts = BitmapFactory.Options().apply {
                    inSampleSize = sampleSize
                }
                val bitmap = BitmapFactory.decodeByteArray(artBytes, 0, artBytes.size, decodeOpts)
                    ?: return@withRetriever null

                val stream = ByteArrayOutputStream()
                bitmap.compress(Bitmap.CompressFormat.JPEG, 80, stream)
                bitmap.recycle()

                val base64 = "data:image/jpeg;base64," + Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
                artworkCache.put(uri, base64)
                base64
            } catch (_: Exception) {
                null
            }
        }
    }

    private fun extractMetadata(uri: String): Map<String, Any?> {
        return withRetriever { retriever ->
            try {
                val context = appContext.reactContext ?: return@withRetriever emptyMap()
                retriever.setDataSource(context, Uri.parse(uri))
                mapOf(
                    "bitrate" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_BITRATE)?.toIntOrNull(),
                    "sampleRate" to extractSampleRate(retriever),
                    "mimeType" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_MIMETYPE),
                    "title" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE),
                    "artist" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST),
                    "album" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM),
                    "duration" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull(),
                    "hasArtwork" to (retriever.embeddedPicture != null)
                )
            } catch (_: Exception) {
                emptyMap()
            }
        }
    }

    private fun extractSampleRate(retriever: MediaMetadataRetriever): Int? {
        return try {
            val sr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_SAMPLERATE)
            sr?.toIntOrNull()
        } catch (_: Exception) {
            null
        }
    }

    private fun calculateSampleSize(width: Int, height: Int, maxSize: Int): Int {
        var sampleSize = 1
        if (width > maxSize || height > maxSize) {
            val halfWidth = width / 2
            val halfHeight = height / 2
            while (halfWidth / sampleSize >= maxSize && halfHeight / sampleSize >= maxSize) {
                sampleSize *= 2
            }
        }
        return sampleSize
    }

    override fun definition() = ModuleDefinition {
        Name("ArtworkModule")

        AsyncFunction("getArtwork") { uri: String, maxSize: Int ->
            extractArtwork(uri, if (maxSize > 0) maxSize else MAX_BITMAP_SIZE)
        }

        AsyncFunction("getMetadata") { uri: String ->
            extractMetadata(uri)
        }

        AsyncFunction("getArtworkBatch") { uris: List<String>, maxSize: Int ->
            val size = if (maxSize > 0) maxSize else MAX_BITMAP_SIZE
            uris.map { uri ->
                mapOf(
                    "uri" to uri,
                    "artwork" to extractArtwork(uri, size)
                )
            }
        }

        AsyncFunction("clearCache") {
            artworkCache.evictAll()
            true
        }

        OnDestroy {
            artworkCache.evictAll()
            while (true) {
                val r = retrieverPool.poll() ?: break
                try { r.release() } catch (_: Exception) {}
            }
        }
    }
}
