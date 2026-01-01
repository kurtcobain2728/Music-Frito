/**
 * PlayerContext - Global state management for audio playback
 * Provides centralized control over the audio player across the app
 */

import React, { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useRef, 
  useEffect,
  type ReactNode 
} from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { 
  Track, 
  PlayerState, 
  PlayerControls, 
  RepeatMode 
} from '@/types/audio';

// =============================================================================
// Context Types
// =============================================================================

interface PlayerContextValue {
  state: PlayerState;
  controls: PlayerControls;
}

// =============================================================================
// Default State
// =============================================================================

const defaultPlayerState: PlayerState = {
  currentTrack: null,
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  isLoading: false,
  position: 0,
  duration: 0,
  volume: 1.0,
  shuffle: false,
  repeat: 'off',
};

// =============================================================================
// Context Creation
// =============================================================================

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

// =============================================================================
// Provider Component
// =============================================================================

interface PlayerProviderProps {
  children: ReactNode;
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  // State management
  const [state, setState] = useState<PlayerState>(defaultPlayerState);
  
  // Original queue before shuffle (for restoring order)
  const originalQueueRef = useRef<Track[]>([]);
  
  // Expo Audio player instance
  const player = useAudioPlayer(
    state.currentTrack?.uri 
      ? { uri: state.currentTrack.uri } 
      : null
  );
  
  // Get real-time player status
  const status = useAudioPlayerStatus(player);

  // Sync player status with state
  useEffect(() => {
    if (status) {
      setState(prev => ({
        ...prev,
        isPlaying: status.playing,
        position: status.currentTime * 1000, // Convert to ms
        duration: status.duration * 1000,    // Convert to ms
        isLoading: status.isBuffering,
      }));
    }
  }, [status]);

  // =============================================================================
  // Shuffle Logic
  // =============================================================================

  /**
   * Shuffles an array using Fisher-Yates algorithm
   * @param array - Array to shuffle
   * @returns Shuffled array
   */
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // =============================================================================
  // Player Controls
  // =============================================================================

  /**
   * Play/resume the current track
   */
  const play = useCallback(async () => {
    if (player && state.currentTrack) {
      await player.play();
    }
  }, [player, state.currentTrack]);

  /**
   * Pause the current track
   */
  const pause = useCallback(async () => {
    if (player) {
      await player.pause();
    }
  }, [player]);

  /**
   * Toggle between play and pause
   */
  const togglePlayPause = useCallback(async () => {
    if (state.isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [state.isPlaying, play, pause]);

  /**
   * Play a specific track, optionally with a new queue
   * @param track - Track to play
   * @param queue - Optional new queue to set
   */
  const playTrack = useCallback(async (track: Track, queue?: Track[]) => {
    const newQueue = queue || [track];
    const trackIndex = newQueue.findIndex(t => t.id === track.id);
    
    // Store original queue for shuffle restore
    originalQueueRef.current = newQueue;
    
    setState(prev => ({
      ...prev,
      currentTrack: track,
      queue: prev.shuffle ? shuffleArray(newQueue) : newQueue,
      currentIndex: trackIndex >= 0 ? trackIndex : 0,
      isLoading: true,
    }));
  }, []);

  /**
   * Skip to the next track
   */
  const next = useCallback(async () => {
    if (state.queue.length === 0) return;

    let nextIndex = state.currentIndex + 1;

    // Handle end of queue based on repeat mode
    if (nextIndex >= state.queue.length) {
      if (state.repeat === 'all') {
        nextIndex = 0;
      } else if (state.repeat === 'one') {
        // Restart current track
        await player?.seekTo(0);
        await player?.play();
        return;
      } else {
        // Stop playback at end of queue
        setState(prev => ({ ...prev, isPlaying: false }));
        return;
      }
    }

    const nextTrack = state.queue[nextIndex];
    if (nextTrack) {
      setState(prev => ({
        ...prev,
        currentTrack: nextTrack,
        currentIndex: nextIndex,
        isLoading: true,
      }));
    }
  }, [state.queue, state.currentIndex, state.repeat, player]);

  /**
   * Go to the previous track
   */
  const previous = useCallback(async () => {
    // If more than 3 seconds into track, restart it
    if (state.position > 3000) {
      await player?.seekTo(0);
      return;
    }

    if (state.queue.length === 0) return;

    let prevIndex = state.currentIndex - 1;

    // Handle beginning of queue
    if (prevIndex < 0) {
      if (state.repeat === 'all') {
        prevIndex = state.queue.length - 1;
      } else {
        // Restart first track
        await player?.seekTo(0);
        return;
      }
    }

    const prevTrack = state.queue[prevIndex];
    if (prevTrack) {
      setState(prev => ({
        ...prev,
        currentTrack: prevTrack,
        currentIndex: prevIndex,
        isLoading: true,
      }));
    }
  }, [state.queue, state.currentIndex, state.position, state.repeat, player]);

  /**
   * Seek to a position in the current track
   * @param position - Position in milliseconds
   */
  const seek = useCallback(async (position: number) => {
    if (player) {
      await player.seekTo(position / 1000); // Convert to seconds
    }
  }, [player]);

  /**
   * Set the volume level
   * @param volume - Volume level (0.0 to 1.0)
   */
  const setVolume = useCallback(async (volume: number) => {
    if (player) {
      player.volume = Math.max(0, Math.min(1, volume));
      setState(prev => ({ ...prev, volume }));
    }
  }, [player]);

  /**
   * Toggle shuffle mode on/off
   */
  const toggleShuffle = useCallback(() => {
    setState(prev => {
      const newShuffle = !prev.shuffle;
      
      if (newShuffle) {
        // Enable shuffle: shuffle queue keeping current track in place
        const currentTrack = prev.currentTrack;
        const otherTracks = prev.queue.filter(t => t.id !== currentTrack?.id);
        const shuffledOthers = shuffleArray(otherTracks);
        const newQueue = currentTrack 
          ? [currentTrack, ...shuffledOthers] 
          : shuffledOthers;
        
        return {
          ...prev,
          shuffle: true,
          queue: newQueue,
          currentIndex: 0,
        };
      } else {
        // Disable shuffle: restore original order
        const currentTrack = prev.currentTrack;
        const newQueue = originalQueueRef.current;
        const newIndex = currentTrack 
          ? newQueue.findIndex(t => t.id === currentTrack.id) 
          : 0;
        
        return {
          ...prev,
          shuffle: false,
          queue: newQueue,
          currentIndex: newIndex >= 0 ? newIndex : 0,
        };
      }
    });
  }, []);

  /**
   * Cycle through repeat modes: off -> all -> one -> off
   */
  const toggleRepeat = useCallback(() => {
    setState(prev => {
      const modes: RepeatMode[] = ['off', 'all', 'one'];
      const currentModeIndex = modes.indexOf(prev.repeat);
      const nextModeIndex = (currentModeIndex + 1) % modes.length;
      return { ...prev, repeat: modes[nextModeIndex] };
    });
  }, []);

  /**
   * Add tracks to the end of the queue
   * @param tracks - Tracks to add
   */
  const addToQueue = useCallback((tracks: Track[]) => {
    setState(prev => ({
      ...prev,
      queue: [...prev.queue, ...tracks],
    }));
    // Also update original queue
    originalQueueRef.current = [...originalQueueRef.current, ...tracks];
  }, []);

  /**
   * Clear the queue and stop playback
   */
  const clearQueue = useCallback(() => {
    player?.pause();
    setState(defaultPlayerState);
    originalQueueRef.current = [];
  }, [player]);

  // =============================================================================
  // Handle Track End
  // =============================================================================

  useEffect(() => {
    if (status && status.didJustFinish) {
      // Track finished playing, go to next
      next();
    }
  }, [status, next]);

  // =============================================================================
  // Auto-play when track changes
  // =============================================================================

  useEffect(() => {
    if (state.currentTrack && player && !state.isPlaying && state.isLoading) {
      // Small delay to ensure player is ready
      const timeout = setTimeout(() => {
        player.play();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [state.currentTrack, player, state.isPlaying, state.isLoading]);

  // =============================================================================
  // Context Value
  // =============================================================================

  const controls: PlayerControls = {
    play,
    pause,
    togglePlayPause,
    next,
    previous,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    playTrack,
    addToQueue,
    clearQueue,
  };

  const contextValue: PlayerContextValue = {
    state,
    controls,
  };

  return (
    <PlayerContext.Provider value={contextValue}>
      {children}
    </PlayerContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access the player context
 * @throws Error if used outside of PlayerProvider
 * @returns PlayerContextValue with state and controls
 */
export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  
  return context;
}

export default PlayerContext;
