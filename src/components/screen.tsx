import { type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

type Props = {
  title?: string;
  subtitle?: string;
  /** Replaces the default title block. */
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function Screen({ title, subtitle, header, children, footer }: Props) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          {header ?? (
            <View style={styles.header}>
              <ThemedText type="subtitle">{title}</ThemedText>
              {subtitle && (
                <ThemedText type="small" themeColor="textSecondary">
                  {subtitle}
                </ThemedText>
              )}
            </View>
          )}
          {children}
        </ScrollView>
        {footer && <View style={styles.footer}>{footer}</View>}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    padding: Spacing.three,
    // The web tab bar floats over the top of the page.
    paddingTop: Platform.OS === 'web' ? Spacing.six + Spacing.four : Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six * 2,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.one,
  },
  footer: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: BottomTabInset + Spacing.three,
  },
});
