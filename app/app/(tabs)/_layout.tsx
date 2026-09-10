import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { colors } from '../../constants/theme';

function GlassTabBackground() {
  return <BlurView intensity={Platform.OS === 'ios' ? 72 : 45} tint="light" style={styles.glass} />;
}

export default function TabLayout() {
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: colors.green,
    tabBarInactiveTintColor: '#68777D',
    tabBarStyle: styles.tabBar,
    tabBarBackground: GlassTabBackground,
    tabBarItemStyle: styles.tabItem,
    tabBarActiveBackgroundColor: 'rgba(255, 255, 255, 0.72)',
    tabBarLabelStyle: styles.label,
  }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="projects" options={{ title: 'Projects', tabBarIcon: ({ color, size }) => <Ionicons name="layers-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="tickets" options={{ title: 'Tickets', tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} /> }} />
  </Tabs>;
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    height: 68,
    paddingTop: 6,
    paddingBottom: 6,
    borderTopWidth: 0,
    borderRadius: 26,
    backgroundColor: 'transparent',
    elevation: 0,
    shadowColor: '#233239',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
  },
  glass: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    borderRadius: 26,
    backgroundColor: 'rgba(245, 250, 249, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.84)',
  },
  tabItem: {
    borderRadius: 19,
    marginHorizontal: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: -2,
  },
});
