# Smart Combo app (your live site in a frame + splash screen)

What it does: opens your live shop full screen. Shows a splash screen while it loads. The phone's Back button goes back inside the shop. WhatsApp, phone and email links open the right app. If there is no internet it shows a "Try again" screen. Nothing else.

## 1. First setup (once)
1. Put this folder somewhere simple, for example `C:\Users\Systems Technologies\smartcombo-app`.
2. Open PowerShell in that folder and run: `npm install`
3. Open `config.ts` and check `SITE_URL` is your live shop address (must start with https://).

## 2. Quick test on your Android phone (no build, 5 minutes)
1. On the phone install the free **Expo Go** app from the Play Store.
2. On the computer run: `npx expo start`
3. Scan the QR code with Expo Go (computer and phone on the same Wi-Fi).
4. The shop opens inside the app. (Expo Go shows Expo's own splash and icon; yours appears only in the real build below.)

## 3. Build a real installable app file (APK)
1. Make a free account at expo.dev.
2. Run: `npm install -g eas-cli` then `eas login`
3. Run: `eas build --platform android --profile preview`  (first time it asks to set up the project: say yes)
4. When it finishes it gives a link. Open the link on your phone, download the .apk and install it (allow "install unknown apps" for your browser when asked).
5. This is the file you can share with testers. For the Play Store you later run `eas build --platform android --profile production` (makes an .aab file).

## 4. Put in your own logo and splash
Replace these files in the `assets` folder, keeping the same names and sizes, then build again:
- `icon.png`: 1024 x 1024, no transparency (the app icon).
- `android-icon-foreground.png`: 1024 x 1024 with transparent background, logo kept inside the middle 60 percent.
- `android-icon-monochrome.png`: same shape, white logo on transparent.
- `splash-icon.png`: your logo on a transparent background (about 512 x 512). It is shown centred on a dark background; change the colour and size in `app.json` under `expo-splash-screen`.
The current images are plain SC placeholders.

## 5. Things to know before you publish
- The app id `ng.com.smartcombo.app` (in `app.json`, two places) can NEVER change after the app is on the Play Store. Change it now if you want a different one.
- Version number: change `version` in `app.json` for each update. Website changes show up in the app automatically without a new build.
- iPhone: the same code works, but Apple may reject an app that is only a website. Android first.

## 6. Test checklist
- Splash shows, then the shop appears and the splash disappears.
- Tap Pay bills, a product, the cart: all work. Phone Back button goes back; on the first page it closes the app.
- Tap WhatsApp: the WhatsApp app opens. Tap a phone number or email link: dialer or mail opens.
- Pay with Paystack (test keys on a test site, or a small real payment on live): it opens, completes and returns to the shop. If a bank page opens another app and does not return, tell Claude which bank.
- Switch on airplane mode and open the app: "No internet connection" with Try again; turn it off, tap Try again: the shop loads.
- Sign in with an email code (needs Resend verified), close the app, open it again: still signed in.
