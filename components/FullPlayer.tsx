import { BorderRadius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { memo, useRef, useState } from 'react';
import {
  Alert,
  PanResponder,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useAudioMetadata } from '@/hooks/useAudioMetadata';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { LyricsSheet } from './LyricsSheet';
import { OptimizedArtwork } from './OptimizedArtwork';
import { ProgressBar } from './ProgressBar';
import { QueueModal } from './QueueModal';
import { ShuffleButton } from './ShuffleButton';

function FullPlayerComponent() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { state, controls } = usePlayer();
  const { theme } = useTheme();
  const c = theme.colors;
  const { isFavorite, toggleFavorite } = useFavorites();
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showLyricsSheet, setShowLyricsSheet] = useState(false);
  const { currentTrack, isPlaying, position, duration, shuffle, repeat, queue, currentIndex } = state;
  const audioMeta = useAudioMetadata(currentTrack?.uri, currentTrack?.id);

  const maxArtworkSize = screenWidth - Spacing.xl * 2;
  const availableHeight = screenHeight - insets.top - insets.bottom - 350;
  const artworkSize = Math.min(maxArtworkSize, availableHeight, 320);
  const playButtonSize = Math.min(64, screenWidth * 0.16);
  const skipButtonSize = Math.min(28, screenWidth * 0.07);
  const secondaryIconSize = Math.min(22, screenWidth * 0.055);

  const isCurrentFavorite = currentTrack ? isFavorite(currentTrack.id) : false;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const swipeHandled = useRef(false);

  const SWIPE_H_THRESHOLD = 80;
  const SWIPE_V_THRESHOLD = 60;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 15 || Math.abs(gs.dy) > 15,
      onPanResponderGrant: () => {
        swipeHandled.current = false;
      },
      onPanResponderMove: (_, gs) => {
        if (swipeHandled.current) return;
        if (Math.abs(gs.dx) > Math.abs(gs.dy)) {
          translateX.value = gs.dx * 0.4;
        } else {
          translateY.value = gs.dy * 0.3;
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (!swipeHandled.current) {
          if (gs.dy < -SWIPE_V_THRESHOLD && Math.abs(gs.dy) > Math.abs(gs.dx)) {
            swipeHandled.current = true;
            setShowQueueModal(true);
          } else if (gs.dy > SWIPE_V_THRESHOLD && Math.abs(gs.dy) > Math.abs(gs.dx)) {
            swipeHandled.current = true;
            router.back();
          } else if (gs.dx < -SWIPE_H_THRESHOLD && Math.abs(gs.dx) > Math.abs(gs.dy)) {
            swipeHandled.current = true;
            controls.next();
          } else if (gs.dx > SWIPE_H_THRESHOLD && Math.abs(gs.dx) > Math.abs(gs.dy)) {
            swipeHandled.current = true;
            controls.previous();
          }
        }
        translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
      },
      onPanResponderTerminate: () => {
        translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
      },
    }),
  ).current;

  const gestureAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  if (!currentTrack) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.background }]}>
        <LinearGradient colors={[c.backgroundHighlight, c.background]} style={styles.gradient}>
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes" size={64} color={c.textMuted} />
            <Text style={[styles.emptyText, { color: c.textMuted }]}>No hay cancion reproduciendose</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const handleClose = () => {
    router.back();
  };
  const handleToggleFavorite = () => {
    if (currentTrack) toggleFavorite(currentTrack);
  };
  const handleAddToPlaylist = () => {
    setShowPlaylistModal(true);
  };
  const getRepeatColor = () => (repeat !== 'off' ? c.primary : c.textSecondary);

  const handleShare = async () => {
    if (!currentTrack) return;
    try {
      await Share.share({
        message: `Escuchando: ${currentTrack.title} - ${currentTrack.artist}\n\nCompartido desde Frito Music`,
        title: 'Compartir cancion',
      });
    } catch (_e) {}
  };

  const handleDeviceInfo = () => {
    Alert.alert('Salida de Audio', 'La musica se reproduce a traves del dispositivo de audio activo.', [
      { text: 'Entendido' },
    ]);
  };

  const handleShowQueue = () => {
    setShowQueueModal(true);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.background }]}>
      <LinearGradient
        colors={[c.backgroundHighlight, c.background, c.background]}
        locations={[0, 0.3, 1]}
        style={styles.gradient}
      >
        <Animated.View style={[styles.scrollContent, gestureAnimatedStyle]} {...panResponder.panHandlers}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
              <Ionicons name="chevron-down" size={28} color={c.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={[styles.headerLabel, { color: c.textMuted }]}>REPRODUCIENDO DE</Text>
              <Text style={[styles.headerTitle, { color: c.textPrimary }]} numberOfLines={1}>
                {currentTrack.album}
              </Text>
            </View>
            <TouchableOpacity style={styles.headerButton} onPress={handleAddToPlaylist}>
              <Ionicons name="add-circle-outline" size={24} color={c.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.artworkContainer, { width: artworkSize, height: artworkSize, ...Shadows.xl }]}>
            <OptimizedArtwork
              uri={currentTrack.artwork}
              trackUri={currentTrack.uri}
              trackId={currentTrack.id}
              size={artworkSize}
              borderRadius={BorderRadius.lg}
              iconSize={artworkSize * 0.25}
            />
          </View>

          <View style={styles.trackInfo}>
            <View style={styles.trackInfoText}>
              <Text style={[styles.trackTitle, { color: c.textPrimary }]} numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <Text style={[styles.trackArtist, { color: c.textSecondary }]} numberOfLines={1}>
                {currentTrack.artist}
              </Text>
            </View>
            <TouchableOpacity style={styles.likeButton} onPress={handleToggleFavorite}>
              <Ionicons
                name={isCurrentFavorite ? 'heart' : 'heart-outline'}
                size={26}
                color={isCurrentFavorite ? '#FF6B6B' : c.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.progressContainer}>
            <ProgressBar
              position={position}
              duration={duration}
              onSeek={controls.seek}
              showTimeLabels={true}
              isPlaying={isPlaying}
            />
            {audioMeta.label && <Text style={[styles.audioMetaLabel, { color: c.textMuted }]}>{audioMeta.label}</Text>}
          </View>

          <View style={styles.mainControls}>
            <ShuffleButton isActive={shuffle} onPress={controls.toggleShuffle} size={secondaryIconSize} />
            <TouchableOpacity style={styles.skipControl} onPress={controls.previous}>
              <Ionicons name="play-skip-back" size={skipButtonSize} color={c.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.playButton,
                {
                  width: playButtonSize,
                  height: playButtonSize,
                  borderRadius: playButtonSize / 2,
                  backgroundColor: c.textPrimary,
                  ...Shadows.lg,
                },
              ]}
              onPress={controls.togglePlayPause}
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={playButtonSize * 0.45} color={c.background} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipControl} onPress={controls.next}>
              <Ionicons name="play-skip-forward" size={skipButtonSize} color={c.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryControl} onPress={controls.toggleRepeat}>
              <View>
                <Ionicons name="repeat" size={secondaryIconSize} color={getRepeatColor()} />
                {repeat === 'one' && (
                  <View style={[styles.repeatOneBadge, { backgroundColor: c.primary }]}>
                    <Text style={[styles.repeatOneText, { color: c.background }]}>1</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          <View style={[styles.bottomControls, { paddingBottom: insets.bottom + Spacing.base }]}>
            <TouchableOpacity style={styles.bottomButton} onPress={handleDeviceInfo}>
              <Ionicons name="phone-portrait-outline" size={18} color={c.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomButton} onPress={() => setShowLyricsSheet(true)}>
              <Ionicons name="text" size={18} color={c.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={18} color={c.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomButton} onPress={handleShowQueue}>
              <Ionicons name="list" size={18} color={c.textSecondary} />
              <Text style={[styles.queueText, { color: c.textSecondary }]}>
                {currentIndex + 1}/{queue.length}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>

      <AddToPlaylistModal
        visible={showPlaylistModal}
        track={currentTrack}
        onClose={() => setShowPlaylistModal(false)}
      />
      <QueueModal visible={showQueueModal} onClose={() => setShowQueueModal(false)} />
      <LyricsSheet visible={showLyricsSheet} onClose={() => setShowLyricsSheet(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  scrollContent: { flex: 1, paddingHorizontal: Spacing.lg },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: Typography.fontSize.lg, marginTop: Spacing.base },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerLabel: { fontSize: Typography.fontSize.xs, letterSpacing: 1, marginBottom: 2 },
  headerTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  artworkContainer: { alignSelf: 'center', marginTop: Spacing.lg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  trackInfo: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg },
  trackInfoText: { flex: 1 },
  trackTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, marginBottom: 4 },
  trackArtist: { fontSize: Typography.fontSize.base },
  likeButton: { padding: Spacing.sm },
  progressContainer: { marginTop: Spacing.lg },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.base,
    paddingHorizontal: Spacing.sm,
  },
  secondaryControl: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  skipControl: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  playButton: { alignItems: 'center', justifyContent: 'center' },
  repeatOneBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatOneText: { fontSize: 8, fontWeight: '700' },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  bottomButton: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm },
  queueText: { fontSize: Typography.fontSize.xs, marginLeft: Spacing.xs },
  audioMetaLabel: { fontSize: Typography.fontSize.xs, textAlign: 'center' as const, marginTop: Spacing.xs },
});

export const FullPlayer = memo(FullPlayerComponent);
export default FullPlayer;
