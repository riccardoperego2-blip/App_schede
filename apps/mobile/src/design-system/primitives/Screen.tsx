import { ScrollView, type ScrollViewProps, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

interface ScreenProps extends ViewProps {
  scroll?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  contentClassName?: string;
  scrollProps?: ScrollViewProps;
}

export function Screen({
  scroll = false,
  edges = ['top'],
  className = '',
  contentClassName = '',
  scrollProps,
  children,
  ...rest
}: ScreenProps) {
  return (
    <SafeAreaView edges={edges} className={`flex-1 bg-bg-primary ${className}`} {...rest}>
      <StatusBar style="light" />
      {scroll ? (
        <ScrollView
          contentContainerClassName={`p-5 ${contentClassName}`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View className={`flex-1 p-5 ${contentClassName}`}>{children}</View>
      )}
    </SafeAreaView>
  );
}
