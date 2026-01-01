/**
 * CreatePlaylistModal Component
 * Modal to create a new playlist
 */

import React, { useState, memo } from 'react';
import { 
  View, 
  Text, 
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

// =============================================================================
// Types
// =============================================================================

interface CreatePlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

// =============================================================================
// Component
// =============================================================================

function CreatePlaylistModalComponent({ visible, onClose, onCreate }: CreatePlaylistModalProps) {
  const [name, setName] = useState('');

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim());
      setName('');
    }
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Nueva lista de reproducción</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Input */}
          <TextInput
            style={styles.input}
            placeholder="Nombre de la lista"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.createButton, !name.trim() && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={!name.trim()}
            >
              <Text style={[styles.createText, !name.trim() && styles.createTextDisabled]}>
                Crear
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  container: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: Colors.backgroundElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  
  // Input
  input: {
    backgroundColor: Colors.backgroundHighlight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  
  // Actions
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginRight: Spacing.sm,
  },
  cancelText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  createButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  createButtonDisabled: {
    backgroundColor: Colors.backgroundHighlight,
  },
  createText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.background,
  },
  createTextDisabled: {
    color: Colors.textMuted,
  },
});

// =============================================================================
// Export
// =============================================================================

export const CreatePlaylistModal = memo(CreatePlaylistModalComponent);
export default CreatePlaylistModal;
