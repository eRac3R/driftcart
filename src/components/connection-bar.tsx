import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCart } from '@/store/app';

/** Always-visible network state, plus the "lift mode" switch the demo hinges on. */
export function ConnectionBar() {
  const theme = useTheme();
  const deviceOnline = useCart((s) => s.deviceOnline);
  const simulatedOffline = useCart((s) => s.simulatedOffline);
  const phase = useCart((s) => s.phase);
  const setSimulatedOffline = useCart((s) => s.setSimulatedOffline);
  const online = deviceOnline && !simulatedOffline;

  const label = online
    ? phase === 'submitting'
      ? 'Online · placing order…'
      : 'Online'
    : simulatedOffline
      ? 'Offline (lift mode)'
      : 'Offline';

  return (
    <View
      style={[styles.bar, { backgroundColor: online ? theme.goodBackground : theme.badBackground }]}>
      <View style={[styles.dot, { backgroundColor: online ? theme.good : theme.bad }]} />
      <View style={styles.text}>
        <ThemedText type="smallBold" style={{ color: online ? theme.good : theme.bad }}>
          {label}
        </ThemedText>
        {phase === 'queued' && (
          <ThemedText type="small" themeColor="textSecondary">
            1 order queued, sends on reconnect
          </ThemedText>
        )}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Lift mode
      </ThemedText>
      <Switch
        testID="lift-mode"
        accessibilityLabel="Simulate being offline"
        value={simulatedOffline}
        onValueChange={setSimulatedOffline}
        trackColor={{ true: theme.bad, false: theme.backgroundSelected }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  text: {
    flex: 1,
  },
});
