package com.fritomusic.mediaservice

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.util.LruCache
import androidx.core.app.NotificationCompat
import androidx.media.session.MediaButtonReceiver
import java.util.concurrent.Executors

class MusicPlaybackService : Service() {

    companion object {
        const val CHANNEL_ID = "frito_music_playback"
        const val NOTIFICATION_ID = 1337

        const val ACTION_PLAY = "com.fritomusic.ACTION_PLAY"
        const val ACTION_PAUSE = "com.fritomusic.ACTION_PAUSE"
        const val ACTION_NEXT = "com.fritomusic.ACTION_NEXT"
        const val ACTION_PREVIOUS = "com.fritomusic.ACTION_PREVIOUS"
        const val ACTION_STOP = "com.fritomusic.ACTION_STOP"

        var instance: MusicPlaybackService? = null
            private set
    }

    private lateinit var mediaSession: MediaSessionCompat
    private lateinit var notificationManager: NotificationManager
    private val artworkCache = LruCache<String, Bitmap>(10)
    private val executor = Executors.newSingleThreadExecutor()
    private var currentArtwork: Bitmap? = null
    private var currentTitle: String = ""
    private var currentArtist: String = ""
    private var currentAlbum: String = ""
    private var currentDurationMs: Long = 0
    private var currentPositionMs: Long = 0
    private var isPlaying: Boolean = false
    private var callback: MediaServiceCallback? = null

    interface MediaServiceCallback {
        fun onPlay()
        fun onPause()
        fun onNext()
        fun onPrevious()
        fun onSeekTo(positionMs: Long)
        fun onStop()
    }

    inner class LocalBinder : Binder() {
        fun getService(): MusicPlaybackService = this@MusicPlaybackService
    }

    private val binder = LocalBinder()

    private val controlReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                ACTION_PLAY -> callback?.onPlay()
                ACTION_PAUSE -> callback?.onPause()
                ACTION_NEXT -> callback?.onNext()
                ACTION_PREVIOUS -> callback?.onPrevious()
                ACTION_STOP -> {
                    callback?.onStop()
                    stopSelf()
                }
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        createNotificationChannel()
        initMediaSession()
        registerControlReceiver()
    }

    private fun registerControlReceiver() {
        val filter = IntentFilter().apply {
            addAction(ACTION_PLAY)
            addAction(ACTION_PAUSE)
            addAction(ACTION_NEXT)
            addAction(ACTION_PREVIOUS)
            addAction(ACTION_STOP)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(controlReceiver, filter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(controlReceiver, filter)
        }
    }

    private fun createNotificationChannel() {
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Frito Music",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Controles de reproducción"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun initMediaSession() {
        mediaSession = MediaSessionCompat(this, "FritoMusic").apply {
            setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or
                MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
            )
            setCallback(object : MediaSessionCompat.Callback() {
                override fun onPlay() { callback?.onPlay() }
                override fun onPause() { callback?.onPause() }
                override fun onSkipToNext() { callback?.onNext() }
                override fun onSkipToPrevious() { callback?.onPrevious() }
                override fun onStop() {
                    callback?.onStop()
                    stopSelf()
                }
                override fun onSeekTo(pos: Long) { callback?.onSeekTo(pos) }
            })
            isActive = true
        }
    }

    fun setCallback(cb: MediaServiceCallback?) {
        callback = cb
    }

    fun getMediaSessionToken(): MediaSessionCompat.Token = mediaSession.sessionToken

    fun updateMetadata(title: String, artist: String, album: String, durationMs: Long, artworkUri: String?) {
        currentTitle = title
        currentArtist = artist
        currentAlbum = album
        currentDurationMs = durationMs

        val metaBuilder = MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, album)
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, durationMs)

        if (artworkUri != null) {
            val cached = artworkCache.get(artworkUri)
            if (cached != null) {
                currentArtwork = cached
                metaBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, cached)
                mediaSession.setMetadata(metaBuilder.build())
                updateNotification()
            } else {
                mediaSession.setMetadata(metaBuilder.build())
                updateNotification()
                executor.execute {
                    val bitmap = loadArtwork(artworkUri)
                    if (bitmap != null) {
                        artworkCache.put(artworkUri, bitmap)
                        currentArtwork = bitmap
                        val updatedMeta = MediaMetadataCompat.Builder()
                            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
                            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, album)
                            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, durationMs)
                            .putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, bitmap)
                            .build()
                        mediaSession.setMetadata(updatedMeta)
                        updateNotification()
                    }
                }
            }
        } else {
            currentArtwork = null
            mediaSession.setMetadata(metaBuilder.build())
            updateNotification()
        }
    }

    fun updatePlaybackState(playing: Boolean, positionMs: Long, speedFactor: Float = 1.0f) {
        isPlaying = playing
        currentPositionMs = positionMs

        val state = if (playing) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED
        val actions = PlaybackStateCompat.ACTION_PLAY or
                PlaybackStateCompat.ACTION_PAUSE or
                PlaybackStateCompat.ACTION_PLAY_PAUSE or
                PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                PlaybackStateCompat.ACTION_SEEK_TO or
                PlaybackStateCompat.ACTION_STOP

        val stateBuilder = PlaybackStateCompat.Builder()
            .setActions(actions)
            .setState(state, positionMs, speedFactor)

        mediaSession.setPlaybackState(stateBuilder.build())
        updateNotification()
    }

    private fun updateNotification() {
        try {
            val notification = buildNotification()
            notificationManager.notify(NOTIFICATION_ID, notification)
        } catch (_: Exception) {}
    }

    private fun buildNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            putExtra("openFullPlayer", true)
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val contentIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val prevAction = NotificationCompat.Action.Builder(
            android.R.drawable.ic_media_previous, "Anterior",
            createActionPendingIntent(ACTION_PREVIOUS)
        ).build()

        val playPauseIcon = if (isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play
        val playPauseLabel = if (isPlaying) "Pausa" else "Reproducir"
        val playPauseAction = NotificationCompat.Action.Builder(
            playPauseIcon, playPauseLabel,
            createActionPendingIntent(if (isPlaying) ACTION_PAUSE else ACTION_PLAY)
        ).build()

        val nextAction = NotificationCompat.Action.Builder(
            android.R.drawable.ic_media_next, "Siguiente",
            createActionPendingIntent(ACTION_NEXT)
        ).build()

        val mediaStyle = androidx.media.app.NotificationCompat.MediaStyle()
            .setMediaSession(mediaSession.sessionToken)
            .setShowActionsInCompactView(0, 1, 2)
            .setShowCancelButton(true)
            .setCancelButtonIntent(createActionPendingIntent(ACTION_STOP))

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(currentTitle.ifEmpty { "Frito Music" })
            .setContentText(currentArtist.ifEmpty { "Sin artista" })
            .setSubText(currentAlbum.ifEmpty { null })
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(contentIntent)
            .setStyle(mediaStyle)
            .addAction(prevAction)
            .addAction(playPauseAction)
            .addAction(nextAction)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(isPlaying)
            .setShowWhen(false)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)

        if (currentArtwork != null) {
            builder.setLargeIcon(currentArtwork)
        }

        return builder.build()
    }

    private fun createActionPendingIntent(action: String): PendingIntent {
        val intent = Intent(action).setPackage(packageName)
        return PendingIntent.getBroadcast(
            this, action.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun loadArtwork(uriStr: String): Bitmap? {
        return try {
            val retriever = MediaMetadataRetriever()
            try {
                retriever.setDataSource(this, Uri.parse(uriStr))
                val bytes = retriever.embeddedPicture
                if (bytes != null) {
                    val opts = BitmapFactory.Options().apply {
                        inJustDecodeBounds = true
                    }
                    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, opts)
                    var sampleSize = 1
                    val maxSize = 512
                    while (opts.outWidth / sampleSize > maxSize || opts.outHeight / sampleSize > maxSize) {
                        sampleSize *= 2
                    }
                    val decodeOpts = BitmapFactory.Options().apply {
                        inSampleSize = sampleSize
                    }
                    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, decodeOpts)
                } else null
            } finally {
                try { retriever.release() } catch (_: Exception) {}
            }
        } catch (_: Exception) {
            null
        }
    }

    fun startForegroundService() {
        try {
            val notification = buildNotification()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (_: Exception) {}
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        MediaButtonReceiver.handleIntent(mediaSession, intent)
        return START_STICKY
    }

    override fun onDestroy() {
        instance = null
        try { unregisterReceiver(controlReceiver) } catch (_: Exception) {}
        mediaSession.isActive = false
        mediaSession.release()
        executor.shutdown()
        super.onDestroy()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        if (!isPlaying) {
            stopSelf()
        }
        super.onTaskRemoved(rootIntent)
    }
}
