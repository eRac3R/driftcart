import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { ConnectionBar } from '@/components/connection-bar';
import { ProductImage } from '@/components/product-image';
import { Screen } from '@/components/screen';
import { SyncLog } from '@/components/sync-log';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatPaise } from '@/domain/money';
import { useTheme } from '@/hooks/use-theme';
import { server, useCart, useServer } from '@/store/app';

const latencies = [100, 250, 800, 2000];
const failRates = [0, 0.3, 0.6, 1];
const lostRates = [0, 0.5, 1];
const pct = (n: number) => `${Math.round(n * 100)}%`;

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="subtitle" style={tone ? { color: tone } : undefined}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

export default function LabScreen() {
  const theme = useTheme();
  const { state, chaos, stats } = useServer();
  const cartIds = useCart(useShallow((s) => s.lines.map((l) => l.productId)));
  const refreshCatalog = useCart((s) => s.refreshCatalog);
  const driftTargets = [...new Set([...cartIds, 'milk', 'coffee', 'cheese', 'bread'])];

  return (
    <Screen
      title="Server lab"
      subtitle="Break the backend on purpose and watch the app cope. This is the in-app mock server.">
      <ConnectionBar />

      <SectionTitle>Make the world drift</SectionTitle>
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          Go offline, then press this to simulate the 20 minutes you spent in a lift: a price rises, one
          item sells out, one runs low, one gets cheaper. Targets your cart first.
        </ThemedText>
        <Button testID="drift" label="Drift prices & stock" onPress={() => server.drift(driftTargets)} />
      </Card>

      <SectionTitle>Network chaos</SectionTitle>
      <Card>
        <ThemedText type="smallBold">Latency</ThemedText>
        <View style={styles.chips}>
          {latencies.map((ms) => (
            <Chip
              key={ms}
              label={`${ms} ms`}
              selected={chaos.latencyMs === ms}
              onPress={() => server.setChaos({ latencyMs: ms })}
            />
          ))}
        </View>
        <ThemedText type="smallBold">Requests dropped</ThemedText>
        <View style={styles.chips}>
          {failRates.map((r) => (
            <Chip key={r} label={pct(r)} selected={chaos.failRate === r} onPress={() => server.setChaos({ failRate: r })} />
          ))}
        </View>
        <ThemedText type="smallBold">Replies lost after the order is saved</ThemedText>
        <View style={styles.chips}>
          {lostRates.map((r) => (
            <Chip
              key={r}
              label={pct(r)}
              selected={chaos.lostReplyRate === r}
              onPress={() => server.setChaos({ lostReplyRate: r })}
            />
          ))}
        </View>
      </Card>

      <SectionTitle>Server counters</SectionTitle>
      <Card style={styles.stats}>
        <Stat label="requests" value={stats.requests} />
        <Stat label="dropped" value={stats.dropped} tone={theme.warn} />
        <Stat label="lost replies" value={stats.lostReplies} tone={theme.bad} />
        <Stat label="duplicates prevented" value={stats.replays} tone={theme.good} />
        <Stat label="orders" value={Object.keys(state.orders).length} />
      </Card>

      <SectionTitle>Server catalog</SectionTitle>
      <Card>
        {Object.values(state.products).map((p) => (
          <View key={p.id} style={styles.product}>
            <ProductImage productId={p.id} size={36} />
            <View style={styles.productBody}>
              <ThemedText type="small">{p.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatPaise(p.pricePaise)} · stock {p.stock}
              </ThemedText>
            </View>
            <Chip label="+10%" selected={false} onPress={() => server.setPrice(p.id, p.pricePaise * 1.1)} />
            <Chip label="Sell out" selected={false} onPress={() => server.setStock(p.id, 0)} />
          </View>
        ))}
        <View style={styles.chips}>
          <Button label="Refresh app catalog" variant="secondary" onPress={() => void refreshCatalog()} />
          <Button label="Reset server" variant="danger" onPress={() => server.reset()} />
        </View>
      </Card>

      <SectionTitle>Sync activity</SectionTitle>
      <SyncLog limit={20} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.three,
  },
  stat: {
    minWidth: 90,
  },
  product: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  productBody: {
    flex: 1,
  },
});
