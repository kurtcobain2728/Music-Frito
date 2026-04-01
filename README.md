# Music Player App 🎵

Una aplicación de reproductor de música moderna y elegante construida con **React Native** y **Expo**. La aplicación ofrece una experiencia de usuario inmersiva con diseños inspirados en _glassmorphism_, animaciones fluidas y soporte completo para la reproducción de audio local.

## ✨ Características Principales

- **Reproducción de Audio Local**: Explora y reproduce archivos de audio almacenados en tu dispositivo.
- **Interfaz Moderna**: Diseño atractivo utilizando efectos de desenfoque (`expo-blur`) y gradientes (`expo-linear-gradient`).
- **Animaciones Suaves**: Transiciones fluidas y controles dinámicos de interfaz usando `react-native-reanimated`.
- **Gestión de la Biblioteca Musical**: Escanea y organiza automáticamente la biblioteca musical local del usuario usando `expo-media-library`.
- **Controles Avanzados**: Permisos nativos, barras de progreso y ecualizador integrado.

## 🛠️ Stack Tecnológico

- [React Native](https://reactnative.dev/) (v0.81.5)
- [Expo](https://expo.dev/) (v54.x)
- [Expo Router](https://docs.expo.dev/router/introduction/) - Navegación basada en archivos.
- **Audio & Multimedia:** `expo-audio`, `expo-media-library`
- **UI & Animación:** `react-native-reanimated`, `expo-blur`, `expo-linear-gradient`

## 🚀 Requisitos Previos

Asegúrate de tener instalado lo siguiente en tu sistema antes de comenzar:

- [Node.js](https://nodejs.org/) (recomendado v18 o superior)
- [npm](https://www.npmjs.com/) (generalmente incluido con Node.js)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- Un emulador de Android/iOS o un dispositivo físico con Expo Go / Development Client.

## 💻 Instalación y Configuración

Sigue estos pasos para comenzar a trabajar en el proyecto localmente.

1. **Clona el repositorio** (si aún no lo has hecho):
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd music-player
   ```

2. **Instala las dependencias**:
   ```bash
   npm install
   ```

3. **Inicia el servidor de desarrollo (Metro Bundler)**:
   ```bash
   npm start
   ```

4. **Ejecución en dispositivos**:
   - Presiona `a` para abrir en Android (Emulador o dispositivo conectado).
   - Presiona `i` para abrir en un simulador de iOS (Sólo en macOS).
   - O escanea el código QR con tu aplicación **Expo Go** o **Development Client**.

## 📱 Compilación Nativa (Release)

Si deseas crear el binario nativo (APK o AAB para Android) directamente desde tu máquina, puedes correr:

```bash
# Para compilar e instalar directamente en el dispositivo
npx expo run:android --variant release
```

Alternativamente, puedes usar **EAS Build** para generar en la nube:
```bash
npm run build:preview
# o
npm run build:dev
```

## 📂 Estructura del Proyecto

```text
music-player/
├── android/          # Código nativo generado para Android
├── ios/              # Código nativo generado para iOS
├── app/              # Rutas principales de la app (Expo Router)
├── components/       # Componentes de UI reutilizables
├── constants/        # Variables de diseño, colores y configuración
├── contexts/         # Proveedores de estado global (React Context)
├── hooks/            # Hooks de React personalizados
├── modules/          # Módulos nativos propios
├── utils/            # Funciones y scripts de ayuda
└── package.json      # Dependencias y configuración de scripts
```

## 📝 Scripts Disponibles

En el directorio del proyecto, puedes ejecutar:

- `npm start` - Inicia el bundler de Expo.
- `npm run android` - Compila localmente e inicia la app en Android.
- `npm run ios` - Compila localmente e inicia la app en iOS.
- `npm run lint` - Analiza el código buscando errores de sintaxis y formato.
- `npm run typecheck` - Verifica los errores de tipado de TypeScript.

## 📄 Licencia

Este proyecto es propiedad privada a menos que se especifique lo contrario.
