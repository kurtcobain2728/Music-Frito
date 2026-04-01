import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useTheme, type ThemeMode, type AccentColor } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ThemeSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, setThemeMode, setAccentColor } = useTheme();
  const c = theme.colors;
  const [customHex, setCustomHex] = useState(theme.customAccentColor || '#1DB954');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const themeModes: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { mode: 'dark', label: 'Oscuro', icon: 'moon' },
    { mode: 'light', label: 'Claro', icon: 'sunny' },
    { mode: 'adaptive', label: 'Adaptativa', icon: 'color-wand' },
    { mode: 'auto', label: 'Automático', icon: 'phone-portrait' },
  ];

  const accentColors: { color: AccentColor; hex: string; label: string }[] = [
    { color: 'green', hex: '#1DB954', label: 'Verde' },
    { color: 'blue', hex: '#1E88E5', label: 'Azul' },
    { color: 'purple', hex: '#9C27B0', label: 'Púrpura' },
    { color: 'pink', hex: '#E91E63', label: 'Rosa' },
    { color: 'orange', hex: '#FF9800', label: 'Naranja' },
    { color: 'red', hex: '#F44336', label: 'Rojo' },
  ];

  const applyCustomColor = () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(customHex)) {
      setAccentColor('custom', customHex);
      setShowCustomInput(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>Apariencia</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Modo de Tema</Text>
        {themeModes.map(({ mode, label, icon }) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.option,
              { backgroundColor: c.backgroundElevated },
              theme.mode === mode && { borderColor: c.primary, borderWidth: 2 },
            ]}
            onPress={() => setThemeMode(mode)}
          >
            <Ionicons name={icon} size={22} color={c.textPrimary} />
            <Text style={[styles.optionLabel, { color: c.textPrimary }]}>{label}</Text>
            {theme.mode === mode && <Ionicons name="checkmark-circle" size={22} color={c.primary} />}
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { color: c.textPrimary, marginTop: Spacing.xl }]}>Color de Acento</Text>
        <View style={styles.colorGrid}>
          {accentColors.map(({ color, hex }) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: hex },
                theme.accentColor === color && styles.colorOptionSelected,
              ]}
              onPress={() => setAccentColor(color)}
            >
              {theme.accentColor === color && <Ionicons name="checkmark" size={22} color="#fff" />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[
              styles.colorOption,
              { backgroundColor: customHex, borderWidth: 2, borderColor: c.border },
              theme.accentColor === 'custom' && styles.colorOptionSelected,
            ]}
            onPress={() => setShowCustomInput(true)}
          >
            <Ionicons name="color-palette" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {showCustomInput && (
          <View style={[styles.customColorRow, { backgroundColor: c.backgroundElevated }]}>
            <TextInput
              style={[styles.customInput, { color: c.textPrimary, borderColor: c.border }]}
              value={customHex}
              onChangeText={setCustomHex}
              placeholder="#1DB954"
              placeholderTextColor={c.textMuted}
              maxLength={7}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={[styles.applyBtn, { backgroundColor: c.primary }]} onPress={applyCustomColor}>
              <Text style={[styles.applyText, { color: c.background }]}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.previewCard, { backgroundColor: c.backgroundElevated, borderColor: c.border }]}>
          <Text style={[styles.previewTitle, { color: c.textPrimary }]}>Vista Previa</Text>
          <View style={[styles.previewBar, { backgroundColor: c.progressBar }]}>
            <View style={[styles.previewBarFill, { backgroundColor: c.primary, width: '60%' }]} />
          </View>
          <View style={styles.previewRow}>
            <View style={[styles.previewDot, { backgroundColor: c.primary }]} />
            <Text style={[styles.previewText, { color: c.textSecondary }]}>Texto secundario</Text>
          </View>
          <View style={styles.previewRow}>
            <View style={[styles.previewDot, { backgroundColor: c.error }]} />
            <Text style={[styles.previewText, { color: c.textMuted }]}>Texto apagado</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.fontSize.lg, fontWeight: '700' },
  scrollContent: { padding: Spacing.base, paddingBottom: 100 },
  sectionTitle: { fontSize: Typography.fontSize.xl, fontWeight: '700', marginBottom: Spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  optionLabel: { flex: 1, marginLeft: Spacing.md, fontSize: Typography.fontSize.md, fontWeight: '500' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorOption: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  colorOptionSelected: { borderWidth: 3, borderColor: '#fff' },
  customColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: Typography.fontSize.md,
    marginRight: Spacing.md,
  },
  applyBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  applyText: { fontSize: Typography.fontSize.base, fontWeight: '600' },
  previewCard: { marginTop: Spacing.xl, padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1 },
  previewTitle: { fontSize: Typography.fontSize.md, fontWeight: '600', marginBottom: Spacing.md },
  previewBar: { height: 6, borderRadius: 3, marginBottom: Spacing.md },
  previewBarFill: { height: '100%', borderRadius: 3 },
  previewRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  previewDot: { width: 10, height: 10, borderRadius: 5, marginRight: Spacing.sm },
  previewText: { fontSize: Typography.fontSize.sm },
});
