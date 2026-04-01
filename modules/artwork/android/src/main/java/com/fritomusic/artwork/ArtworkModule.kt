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
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest
import java.util.concurrent.LinkedBlockingQueue

class ArtworkModule : Module() {

    companion object {
        private const val POOL_SIZE = 3
        private const val CACHE_SIZE = 50
        private const val MAX_BITMAP_SIZE = 512
        private const val DISK_CACHE_DIR = "artwork_cache"
    }

    private val retrieverPool = LinkedBlockingQueue<MediaMetadataRetriever>(POOL_SIZE).apply {
        repeat(POOL_SIZE) { offer(MediaMetadataRetriever()) }
    }

    private val artworkCache = object : LruCache<String, String>(CACHE_SIZE) {}

    private fun getDiskCacheDir(): File? {
        val context = appContext.reactContext ?: return null
        val dir = File(context.cacheDir, DISK_CACHE_DIR)
        if (!dir.exists()) dir.mkdirs()
        return dir
    }

    private fun hashKey(uri: String, maxSize: Int): String {
        val digest = MessageDigest.getInstance("MD5")
        digest.update("$uri:$maxSize".toByteArray())
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    private fun getDiskCachePath(uri: String, maxSize: Int): File? {
        val dir = getDiskCacheDir() ?: return null
        return File(dir, "${hashKey(uri, maxSize)}.jpg")
    }

    private fun readFromDiskCache(uri: String, maxSize: Int): String? {
        val file = getDiskCachePath(uri, maxSize) ?: return null
        if (!file.exists()) return null
        return try {
            val bytes = file.readBytes()
            "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
        } catch (_: Exception) {
            null
        }
    }

    private fun writeToDiskCache(uri: String, maxSize: Int, jpegBytes: ByteArray) {
        try {
            val file = getDiskCachePath(uri, maxSize) ?: return
            FileOutputStream(file).use { it.write(jpegBytes) }
        } catch (_: Exception) {}
    }

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
        val memCached = artworkCache.get("$uri:$maxSize")
        if (memCached != null) return memCached

        val diskCached = readFromDiskCache(uri, maxSize)
        if (diskCached != null) {
            artworkCache.put("$uri:$maxSize", diskCached)
            return diskCached
        }

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

                val jpegBytes = stream.toByteArray()
                writeToDiskCache(uri, maxSize, jpegBytes)

                val base64 = "data:image/jpeg;base64," + Base64.encodeToString(jpegBytes, Base64.NO_WRAP)
                artworkCache.put("$uri:$maxSize", base64)
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

        AsyncFunction("hasDiskCache") { uri: String, maxSize: Int ->
            val file = getDiskCachePath(uri, if (maxSize > 0) maxSize else MAX_BITMAP_SIZE)
            file?.exists() == true
        }

        AsyncFunction("getDiskCachePath") { uri: String, maxSize: Int ->
            val file = getDiskCachePath(uri, if (maxSize > 0) maxSize else MAX_BITMAP_SIZE)
            if (file?.exists() == true) "file://${file.absolutePath}" else null
        }

        AsyncFunction("clearCache") {
            artworkCache.evictAll()
            getDiskCacheDir()?.listFiles()?.forEach { it.delete() }
            true
        }

        AsyncFunction("getDiskCacheSize") {
            val dir = getDiskCacheDir()
            val files = dir?.listFiles() ?: return@AsyncFunction 0L
            files.sumOf { it.length() }
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
