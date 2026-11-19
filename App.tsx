import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useVideoPlayer, VideoView } from 'expo-video'; // SC-BGVIDEO
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { APP_USER_AGENT, BACKGROUND, GOLD, SITE_URL } from './config';

// Keep the splash screen up until the shop has loaded (or failed to).
SplashScreen.preventAutoHideAsync().catch(() => {});

const SITE_HOST = new URL(SITE_URL).host;
// Links that should leave the app: WhatsApp chats open the WhatsApp app.
const EXTERNAL_HOSTS = ['wa.me', 'api.whatsapp.com', 'chat.whatsapp.com'];

// SC-BGVIDEO: muted looping video behind the loading screen, dimmed so the text stays easy to read.
function LoaderBackground() {
  const player = useVideoPlayer(require('./assets/splash-bg.mp4'), (p) => { p.loop = true; p.muted = true; p.play(); });
  return (
    <>
      <VideoView player={player} style={styles.bgVideo} contentFit="cover" nativeControls={false} fullscreenOptions={{ enable: false }} allowsPictureInPicture={false} pointerEvents="none" />
      <View style={styles.bgDim} pointerEvents="none" />
    </>
  );
}

export default function App() {
  const webRef = useRef<WebView<object>>(null);
  const canGoBack = useRef(false);
  const splashHidden = useRef(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retries = useRef(0); // SC-RETRY
  const failing = useRef(false);
  const [failNote, setFailNote] = useState('');
  const [offlineKind, setOfflineKind] = useState(true);

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

  // SC-RETRY: a sleeping or briefly busy server often answers on the next try, so try again quietly before showing the retry screen.
  const handleFail = (offline: boolean, note: string) => {
    if (failing.current) return;
    failing.current = true;
    const max = offline ? 2 : 8;
    if (retries.current < max) {
      retries.current += 1;
      setSlow(true);
      setTimeout(() => {
        failing.current = false;
        progress.setValue(0.05);
        setAttempt((n) => n + 1);
      }, offline ? 2000 : 2500 + retries.current * 500);
      return;
    }
    setOfflineKind(offline);
    setFailNote(note);
    setFailed(true);
    finishLoading();
  };

  // If the shop gives no answer at all for 40 seconds, treat it as a failed try.
  useEffect(() => {
    if (loaded || failed) return;
    const t = setTimeout(() => handleFail(false, 'No answer from the shop'), 40000);
    return () => clearTimeout(t);
  }, [attempt, loaded, failed]); // eslint-disable-line react-hooks/exhaustive-deps

  const retry = () => {
    retries.current = 0;
    failing.current = false;
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
            <Text style={styles.title}>{offlineKind ? 'No internet connection' : 'Smart Combo is not answering'}</Text>
            <Text style={styles.text}>{offlineKind ? 'Check your data or Wi-Fi, then try again. Your orders and wallet are safe.' : 'Your internet looks fine, but the shop did not answer in time. Please try again in a moment. Your orders and wallet are safe.'}</Text>
            {failNote ? <Text style={styles.detail}>{failNote}</Text> : null}
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
            onLoadEnd={() => { setTimeout(() => { if (!failing.current) { retries.current = 0; finishLoading(); } }, 300); }}
            onError={(e) => { const d = String(e.nativeEvent.description || ''); handleFail(/INTERNET_DISCONNECTED|NAME_NOT_RESOLVED/i.test(d), d); }}
            onHttpError={(e) => {
              // The shop itself not answering (server error) shows the same retry screen.
              if (e.nativeEvent.statusCode >= 500 && e.nativeEvent.url.replace(/\/$/, '').endsWith(SITE_HOST)) handleFail(false, 'Server answered with error ' + e.nativeEvent.statusCode);
            }}
            originWhitelist={['*']}
          />
        )}
        {!overlayGone && !failed && (
          <Animated.View style={[styles.loader, { opacity: fade }]} pointerEvents={loaded ? 'none' : 'auto'} onLayout={hideSplash}>
            <LoaderBackground />
            <Image source={require('./assets/logo-mark.png')} style={styles.logo} resizeMode="contain" />
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
  bgVideo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bgDim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,10,0.35)' },
  loader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: BACKGROUND, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  logo: { width: 120, height: 120, marginBottom: 18 },
  brand: { color: '#ffffff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  tag: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8, minHeight: 40 },
  track: { width: 140, height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden', marginTop: 20 },
  bar: { height: 4, borderRadius: 4, backgroundColor: GOLD },
  detail: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center' },
  offline: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 14 },
  title: { color: '#ffffff', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  text: { color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  button: { marginTop: 8, height: 50, paddingHorizontal: 36, borderRadius: 14, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#0a0a0a', fontSize: 16, fontWeight: '900' },
});
