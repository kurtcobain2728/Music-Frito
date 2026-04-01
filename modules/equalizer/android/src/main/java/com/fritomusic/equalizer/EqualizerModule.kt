package com.fritomusic.equalizer

import android.content.Context
import android.media.AudioManager
import android.media.audiofx.Equalizer
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class EqualizerModule : Module() {

    private var equalizer: Equalizer? = null
    private var isEnabled = false

    /**
     * Finds the audio session ID of the currently active audio playback
     * using AudioManager reflection. Falls back to session 0.
     */
    private fun findAppAudioSessionId(): Int {
        try {
            val context = appContext.reactContext ?: return 0
            val audioManager =
                context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return 0

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Use reflection to safely call getActivePlaybackConfigurations
                // and getAudioSessionId to avoid compilation issues across SDK versions
                val method = audioManager.javaClass.getMethod("getActivePlaybackConfigurations")
                val configs = method.invoke(audioManager) as? List<*> ?: return 0

                for (config in configs) {
                    if (config == null) continue
                    val getSessionId = config.javaClass.getMethod("getAudioSessionId")
                    val sessionId = getSessionId.invoke(config) as? Int ?: 0
                    if (sessionId > 0) {
                        return sessionId
                    }
                }
            }
        } catch (_: Exception) {
        }
        return 0
    }

    /**
     * Tries to create an Equalizer on the given audio session.
     * If it fails, falls back to session 0 (global output mix).
     */
    private fun createEqualizer(audioSessionId: Int): Equalizer? {
        return try {
            Equalizer(0, audioSessionId)
        } catch (_: Exception) {
            if (audioSessionId != 0) {
                try {
                    Equalizer(0, 0)
                } catch (_: Exception) {
                    null
                }
            } else {
                null
            }
        }
    }

    /**
     * Reads the current band config from an equalizer instance.
     */
    private fun readBands(eq: Equalizer): List<Map<String, Any>> {
        val numBands = eq.numberOfBands.toInt()
        val bands = mutableListOf<Map<String, Any>>()
        for (i in 0 until numBands) {
            bands.add(
                mapOf(
                    "band" to i,
                    "centerFreq" to eq.getCenterFreq(i.toShort()) / 1000,
                    "level" to eq.getBandLevel(i.toShort()).toInt()
                )
            )
        }
        return bands
    }

    override fun definition() = ModuleDefinition {
        Name("EqualizerModule")

        AsyncFunction("initialize") { _: Int ->
            equalizer?.release()

            val sessionId = findAppAudioSessionId()
            val eq = createEqualizer(sessionId)
                ?: throw Exception("No se pudo crear el ecualizador")

            eq.enabled = false
            isEnabled = false
            equalizer = eq

            val levelRange = eq.bandLevelRange
            val minLevel = levelRange[0].toInt()
            val maxLevel = levelRange[1].toInt()

            val presets = mutableListOf<String>()
            val numPresets = eq.numberOfPresets.toInt()
            for (i in 0 until numPresets) {
                presets.add(eq.getPresetName(i.toShort()))
            }

            mapOf(
                "bands" to readBands(eq),
                "minLevel" to minLevel,
                "maxLevel" to maxLevel,
                "presets" to presets,
                "numBands" to eq.numberOfBands.toInt(),
                "sessionId" to sessionId
            )
        }

        AsyncFunction("reattach") {
            val prevEq = equalizer
            val newSessionId = findAppAudioSessionId()

            // Save current EQ state
            val wasEnabled = isEnabled
            val savedLevels = mutableMapOf<Short, Short>()
            if (prevEq != null) {
                try {
                    val numBands = prevEq.numberOfBands
                    for (i in 0 until numBands) {
                        savedLevels[i.toShort()] = prevEq.getBandLevel(i.toShort())
                    }
                } catch (_: Exception) {
                }
            }

            // Release previous instance
            try {
                prevEq?.release()
            } catch (_: Exception) {
            }

            // Create new equalizer on detected session
            val eq = createEqualizer(newSessionId)
                ?: throw Exception("No se pudo re-crear el ecualizador")

            // Restore band levels
            for ((band, level) in savedLevels) {
                try {
                    eq.setBandLevel(band, level)
                } catch (_: Exception) {
                }
            }

            // Restore enabled state
            eq.enabled = wasEnabled
            isEnabled = wasEnabled
            equalizer = eq

            mapOf(
                "bands" to readBands(eq),
                "sessionId" to newSessionId,
                "enabled" to wasEnabled
            )
        }

        AsyncFunction("setEnabled") { enabled: Boolean ->
            val eq = equalizer ?: return@AsyncFunction false
            eq.enabled = enabled
            isEnabled = enabled
            enabled
        }

        AsyncFunction("setBandLevel") { band: Int, level: Int ->
            val eq = equalizer ?: return@AsyncFunction level
            eq.setBandLevel(band.toShort(), level.toShort())
            level
        }

        AsyncFunction("applyNativePreset") { presetIndex: Int ->
            val eq = equalizer ?: return@AsyncFunction emptyList<Map<String, Any>>()
            eq.usePreset(presetIndex.toShort())
            readBands(eq)
        }

        AsyncFunction("release") {
            equalizer?.release()
            equalizer = null
            isEnabled = false
            true
        }

        OnDestroy {
            equalizer?.release()
            equalizer = null
        }
    }
}
