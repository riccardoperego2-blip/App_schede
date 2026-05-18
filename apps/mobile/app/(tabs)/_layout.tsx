import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../src/design-system';

const TAB_META = {
  index: { label: 'Home', icon: '⌂' },
  history: { label: 'History', icon: '↺' },
  progress: { label: 'Progress', icon: '↗' },
  profile: { label: 'Profile', icon: '◌' },
} as const;

function TabIcon({ route, focused }: { route: keyof typeof TAB_META; focused: boolean }) {
  const meta = TAB_META[route];
  return (
    <View
      className={[
        'min-h-[52px] min-w-[70px] items-center justify-center rounded-2xl px-2 py-1',
        focused ? 'bg-accent-subtle/90' : 'bg-transparent',
      ].join(' ')}
    >
      <Text
        variant="subtitle"
        tone={focused ? 'accent' : 'muted'}
        className="leading-5"
        style={{ fontSize: 24, lineHeight: 26, fontWeight: '600' }}
      >
        {meta.icon}
      </Text>
      <Text
        variant="tiny"
        tone={focused ? 'accent' : 'secondary'}
        className="mt-0.5 text-center font-semibold"
        style={{ fontSize: 11.5, lineHeight: 14, fontWeight: '600' }}
      >
        {meta.label}
      </Text>
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
