import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCart } from '@/store/app';

const time = (at: number) => new Date(at).toTimeString().slice(0, 8);

export function SyncLog({ limit = 12 }: { limit?: number }) {
  const theme = useTheme();
  const log = useCart((s) => s.log);
  const tone = { info: theme.accent, ok: theme.good, warn: theme.warn, error: theme.bad };

  return (
    <Card>
      {log.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Nothing yet. Turn on lift mode and try to check out.
        </ThemedText>
      ) : (
        log.slice(0, limit).map((e) => (
          <View key={e.id} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: tone[e.tone] }]} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.time}>
              {time(e.at)}
            </ThemedText>
            <ThemedText type="small" style={styles.message}>
              {e.message}
            </ThemedText>
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  time: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
  message: {
    flex: 1,
  },
});
