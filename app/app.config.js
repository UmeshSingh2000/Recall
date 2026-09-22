
const isProduction = process.env.APP_ENV === "production";
export default {
  expo: {
    name: isProduction ? "Recall" : "Recall Dev",
    slug: "recall",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "recall",
    userInterfaceStyle: "automatic",

    updates: {
      url: "https://u.expo.dev/376039da-5f94-4b16-bf6b-c5ae81d37f95",
    },

    runtimeVersion: {
      policy: "appVersion",
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: isProduction
        ? "com.umessh.app"
        : "com.umessh.app.dev",
    },

    android: {
      googleServicesFile: isProduction ?
       "./google-services.json" : "./google-services.dev.json",

      adaptiveIcon: {
        backgroundColor: "#102A43",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },

      predictiveBackGestureEnabled: false,

      package:
        isProduction
          ? "com.umessh.app"
          : "com.umessh.app.dev",
    },

    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      "expo-router",

      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          resizeMode: "contain",
          backgroundColor: "#102A43",
        },
      ],

      [
        "expo-notifications",
        {
          defaultChannel: "clipboard-v2",
          color: "#2F855A",
          sounds: ["./assets/sounds/clipboard.wav"],
        },
      ],

      "expo-sharing",
      "expo-secure-store",
    ],

    experiments: {
      typedRoutes: true,
    },

    extra: {
      router: {},
      eas: {
        projectId: "376039da-5f94-4b16-bf6b-c5ae81d37f95",
      },
    },

    owner: "umessh",
  },
};
