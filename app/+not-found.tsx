import { useTheme } from '@/contexts/ThemeContext';
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <Text style={[styles.title, { color: c.textPrimary }]}>Esta pantalla no existe.</Text>

        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: c.primary }]}>Ir al inicio</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
  },
});
