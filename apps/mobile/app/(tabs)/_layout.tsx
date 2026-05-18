import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const TAB_META = {
  index: 'home',
  history: 'history',
  progress: 'progress',
  profile: 'profile',
} as const;

function TabGlyph({ name, color }: { name: (typeof TAB_META)[keyof typeof TAB_META]; color: string }) {
  const common = {
    stroke: color,
    strokeWidth: 2.25,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {name === 'home' ? (
        <>
          <Path d="M4 10.8 12 4l8 6.8" {...common} />
          <Path d="M6.5 10.5V20h11v-9.5" {...common} />
          <Path d="M10 20v-5h4v5" {...common} />
        </>
      ) : null}
      {name === 'history' ? (
        <>
          <Rect x="4" y="5" width="16" height="15" rx="3" {...common} />
          <Path d="M8 3v4M16 3v4M4 10h16" {...common} />
          <Path d="M8 14h4M8 17h7" {...common} />
        </>
      ) : null}
      {name === 'progress' ? (
        <>
          <Path d="M4 19h16" {...common} />
          <Path d="M6 16l4-4 3 3 5-7" {...common} />
          <Path d="M16 8h2v2" {...common} />
        </>
      ) : null}
      {name === 'profile' ? (
        <>
          <Circle cx="12" cy="8" r="3.5" {...common} />
          <Path d="M5.5 20c.9-4 3.2-6 6.5-6s5.6 2 6.5 6" {...common} />
        </>
      ) : null}
    </Svg>
  );
}

function TabIcon({ route, focused }: { route: keyof typeof TAB_META; focused: boolean }) {
  const color = focused ? '#7CFF6B' : '#8A94A6';
  return (
    <View
      className={[
        'min-h-[54px] min-w-[68px] items-center justify-center rounded-2xl px-3',
        focused ? 'bg-accent-subtle/90' : 'bg-transparent',
      ].join(' ')}
    >
      <TabGlyph name={TAB_META[route]} color={color} />
      <View className={`mt-1 h-1 w-5 rounded-pill ${focused ? 'bg-[#7CFF6B]' : 'bg-transparent'}`} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'android' ? Math.max(insets.bottom, 20) : insets.bottom;
  const tabBarHeight = Platform.OS === 'android' ? 80 + bottomPadding : 74 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#7CFF6B',
        tabBarInactiveTintColor: '#8A94A6',
        tabBarStyle: {
          backgroundColor: '#0B0F14',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.08)',
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          shadowColor: '#000',
          shadowOpacity: 0.28,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: -8 },
          elevation: 18,
        },
        tabBarIconStyle: {
          width: 68,
          height: 58,
        },
        tabBarItemStyle: {
          minHeight: 56,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon route="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon route="history" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon route="progress" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon route="profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
