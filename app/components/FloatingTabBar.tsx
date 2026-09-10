import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  projects: 'layers',
  tickets: 'list',
  search: 'search',
  settings: 'settings',
};

export const FLOATING_TAB_BAR_HEIGHT = 64;

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.shadow}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 88 : 56}
          tint="systemChromeMaterialLight"
          style={styles.blur}
        >
          <View style={styles.glassSheen} />
          <View style={styles.tabs}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const label = options.title ?? route.name;
              const isFocused = state.index === index;
              const baseIcon = TAB_ICONS[route.name] ?? 'ellipse';
              const iconName = (isFocused ? baseIcon : `${baseIcon}-outline`) as keyof typeof Ionicons.glyphMap;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  style={styles.tab}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={label}
                >
                  {isFocused ? <View style={styles.activePill} /> : null}
                  <Ionicons name={iconName} size={21} color={isFocused ? colors.green : '#6E7D86'} />
                  <Text style={[styles.label, isFocused && styles.labelActive]} numberOfLines={1}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 42,
  },
  shadow: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 34,
    shadowColor: '#1A2B33',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 14,
  },
  blur: {
    borderRadius: 34,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.72)',
    backgroundColor: Platform.OS === 'android' ? 'rgba(248, 252, 251, 0.82)' : 'rgba(255, 255, 255, 0.18)',
  },
  glassSheen: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
    borderRadius: 34,
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: FLOATING_TAB_BAR_HEIGHT,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingVertical: 6,
  },
  activePill: {
    position: 'absolute',
    width: 54,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#1A2B33',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  label: {
    marginTop: 3,
    fontSize: 9.5,
    fontWeight: '600',
    color: '#6E7D86',
    letterSpacing: 0.1,
  },
  labelActive: {
    color: colors.green,
    fontWeight: '800',
  },
});
