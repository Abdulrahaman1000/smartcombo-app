import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { APP_USER_AGENT, BACKGROUND, GOLD, SITE_URL } from './config';

// Keep the splash screen up until the shop has loaded (or failed to).
SplashScreen.preventAutoHideAsync().catch(() => {});

const SITE_HOST = new URL(SITE_URL).host;
// Links that should leave the app: WhatsApp chats open the WhatsApp app.
const EXTERNAL_HOSTS = ['wa.me', 'api.whatsapp.com', 'chat.whatsapp.com'];

export default function App() {
  const webRef = useRef<WebView<object>>(null);
  const canGoBack = useRef(false);
  const splashHidden = useRef(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [overlayGone, setOverlayGone] = useState(false);

  // The native splash hands over to our loading screen as soon as that is drawn.
  const hideSplash = useCallback(() => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const finishLoading = useCallback(() => {
    setLoaded(true);
    Animated.timing(progress, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: false }).start(() => {
      Animated.timing(fade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setOverlayGone(true));
    });
  }, [progress, fade]);

  const setProgress = (p: number) => {
    Animated.timing(progress, { toValue: Math.min(0.92, Math.max(0.08, p)), duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  };

  // First load of a sleeping server can take a while: say so after 6 seconds.
  useEffect(() => {
    if (loaded || failed) return;
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, [loaded, failed, attempt]);

  // Safety: never keep the native splash up longer than 4 seconds.
  useEffect(() => { const t = setTimeout(hideSplash, 4000); return () => clearTimeout(t); }, [hideSplash]);

  // Phone's back button goes back inside the shop; on the first page it closes the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  // Phone, email, WhatsApp and other app links open the right app instead of the shop frame.
  const onShouldStart = useCallback((req: ShouldStartLoadRequest) => {
    const url = req.url;
    if (!/^https?:\/\//i.test(url)) {
      if (url.startsWith('about:') || url.startsWith('blob:') || url.startsWith('data:')) return true;
      Linking.openURL(url).catch(() => {});
      return false;
    }
    try {
      const host = new URL(url).host;
      if (EXTERNAL_HOSTS.includes(host)) {
        Linking.openURL(url).catch(() => {});
        return false;
      }
    } catch { /* let the page load */ }
    return true;
  }, []);

  const retry = () => {
    setFailed(false);
    setLoaded(false);
    setSlow(false);
    setOverlayGone(false);
    progress.setValue(0);
    fade.setValue(1);
    setAttempt((n) => n + 1);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar style="light" />
        {failed ? (
          <View style={styles.offline}>
            <Text style={styles.title}>No internet connection</Text>
            <Text style={styles.text}>Check your data or Wi-Fi, then try again. Your orders and wallet are safe.</Text>
            <Pressable style={styles.button} onPress={retry} accessibilityRole="button" accessibilityLabel="Try again">
              <Text style={styles.buttonText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <WebView<object>
            key={attempt}
            ref={webRef}
            source={{ uri: SITE_URL }}
            style={styles.web}
            applicationNameForUserAgent={APP_USER_AGENT}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            allowsInlineMediaPlayback
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            setSupportMultipleWindows={false}
            allowsBackForwardNavigationGestures
            injectedJavaScriptBeforeContentLoaded="window.__SC_APP__ = true; true;"
            onNavigationStateChange={(s) => { canGoBack.current = s.canGoBack; }}
            onShouldStartLoadWithRequest={onShouldStart}
            onLoadProgress={(e) => setProgress(e.nativeEvent.progress)}
            onLoadEnd={finishLoading}
            onError={() => { setFailed(true); finishLoading(); }}
            onHttpError={(e) => {
              // The shop itself not answering (server error) shows the same retry screen.
              if (e.nativeEvent.statusCode >= 500 && e.nativeEvent.url.replace(/\/$/, '').endsWith(SITE_HOST)) setFailed(true);
            }}
            originWhitelist={['*']}
          />
        )}
        {!overlayGone && !failed && (
          <Animated.View style={[styles.loader, { opacity: fade }]} pointerEvents={loaded ? 'none' : 'auto'} onLayout={hideSplash}>
            <Image source={require('./assets/splash-icon.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.brand}>Smart Combo</Text>
            <Text style={styles.tag}>{slow ? 'Getting things ready... the first start can take a few seconds.' : 'Gadgets, combos and bill payments'}</Text>
            <View style={styles.track}>
              <Animated.View style={[styles.bar, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
            </View>
          </Animated.View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BACKGROUND },
  web: { flex: 1, backgroundColor: BACKGROUND },
  loader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: BACKGROUND, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  logo: { width: 120, height: 120, marginBottom: 18 },
  brand: { color: '#ffffff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  tag: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8, minHeight: 40 },
  track: { width: 140, height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden', marginTop: 20 },
  bar: { height: 4, borderRadius: 4, backgroundColor: GOLD },
  offline: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 14 },
  title: { color: '#ffffff', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  text: { color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  button: { marginTop: 8, height: 50, paddingHorizontal: 36, borderRadius: 14, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#0a0a0a', fontSize: 16, fontWeight: '900' },
});
