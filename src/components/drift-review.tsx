import { StyleSheet, View } from 'react-native';

import { ProductImage } from '@/components/product-image';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Pill, type Tone } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { billFor } from '@/domain/bill';
import { formatPaise, lineTotal } from '@/domain/money';
import { useTheme } from '@/hooks/use-theme';
import type { DriftReason, LineDiff, Reconciliation } from '@/sync/reconcile';

const reasonPill: Record<DriftReason, (d: LineDiff) => { label: string; tone: Tone }> = {
  price_up: (d) => ({
    label: `Price ↑ ${formatPaise(d.after.pricePaise - d.before.pricePaise)}`,
    tone: 'bad',
  }),
  price_down: (d) => ({
    label: `Price ↓ ${formatPaise(d.before.pricePaise - d.after.pricePaise)}`,
    tone: 'good',
  }),
  qty_capped: (d) => ({ label: `Only ${d.after.qty} left`, tone: 'warn' }),
  sold_out: () => ({ label: 'Sold out', tone: 'bad' }),
  delisted: () => ({ label: 'No longer sold', tone: 'bad' }),
};

function DiffRow({ diff }: { diff: LineDiff }) {
  const theme = useTheme();
  const removed = diff.after.qty === 0;
  const unchanged = diff.reasons.length === 0;
  const before = lineTotal(diff.before.qty, diff.before.pricePaise);
  const after = lineTotal(diff.after.qty, diff.after.pricePaise);

  return (
    <View style={[styles.row, unchanged && styles.dim]} testID={`diff-${diff.productId}`}>
      <ProductImage productId={diff.productId} size={48} dimmed={removed} />
      <View style={styles.rowBody}>
        <ThemedText type="smallBold" style={removed && styles.struck}>
          {diff.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.unit}>
          {diff.unit}
        </ThemedText>
        <View style={styles.pills}>
          {unchanged ? (
            <Pill label="No change" tone="good" />
          ) : (
            diff.reasons.map((r) => <Pill key={r} {...reasonPill[r](diff)} />)
          )}
        </View>
      </View>
      <View style={styles.amounts}>
        {before !== after && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.struck}>
            {diff.before.qty} × {formatPaise(diff.before.pricePaise)}
          </ThemedText>
        )}
        <ThemedText
          type="smallBold"
          style={{
            color: unchanged
              ? theme.text
              : diff.reasons.includes('price_up')
                ? theme.bad
                : diff.reasons.includes('price_down')
                  ? theme.good
                  : theme.warn,
          }}>
          {removed ? '—' : `${diff.after.qty} × ${formatPaise(diff.after.pricePaise)}`}
        </ThemedText>
      </View>
    </View>
  );
}

type Props = {
  review: Reconciliation;
  onAccept: () => void;
  onEdit: () => void;
};

/** The "while you were offline" screen: exactly what changed, in red and green, before anyone pays. */
export function DriftReview({ review, onAccept, onEdit }: Props) {
  const theme = useTheme();
  const changed = review.diffs.filter((d) => d.reasons.length > 0).length;
  // Split the total change so a sold-out item doesn't read as a "saving".
  const priceImpact = review.diffs.reduce(
    (n, d) => n + d.after.qty * (d.after.pricePaise - d.before.pricePaise),
    0,
  );
  const lostImpact = review.totalAfter - review.totalBefore - priceImpact;
  const newBill = billFor(review.lines.map((l) => ({ qty: l.qty, pricePaise: l.pricePaiseSeen })));
  const signed = (p: number) => `${p > 0 ? '+' : '−'}${formatPaise(Math.abs(p))}`;

  return (
    <Card style={[styles.card, { borderColor: theme.warn }]}>
      <ThemedText type="subtitle" style={styles.title}>
        While you were offline…
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {changed} of {review.diffs.length} items changed. Nothing has been charged. Check the new
        cart before placing it.
      </ThemedText>

      <View style={styles.list}>
        {review.diffs.map((d) => (
          <DiffRow key={d.productId} diff={d} />
        ))}
      </View>

      <View style={[styles.totals, { borderTopColor: theme.backgroundSelected }]}>
        <View style={styles.totalRow}>
          <ThemedText type="small" themeColor="textSecondary">
            You saw
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.struck}>
            {formatPaise(review.totalBefore)}
          </ThemedText>
        </View>
        {priceImpact !== 0 && (
          <View style={styles.totalRow}>
            <ThemedText type="small">Price changes</ThemedText>
            <ThemedText type="smallBold" style={{ color: priceImpact > 0 ? theme.bad : theme.good }}>
              {signed(priceImpact)}
            </ThemedText>
          </View>
        )}
        {lostImpact !== 0 && (
          <View style={styles.totalRow}>
            <ThemedText type="small">Sold out or reduced</ThemedText>
            <ThemedText type="smallBold" style={{ color: theme.warn }}>
              {signed(lostImpact)}
            </ThemedText>
          </View>
        )}
        <View style={styles.totalRow}>
          <ThemedText type="small">New item total</ThemedText>
          <ThemedText type="small">{formatPaise(review.totalAfter)}</ThemedText>
        </View>
        {review.lines.length > 0 && (
          <>
            <View style={styles.totalRow}>
              <ThemedText type="small" themeColor="textSecondary">
                Delivery & handling
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatPaise(newBill.deliveryFee + newBill.handlingFee)}
              </ThemedText>
            </View>
            <View style={styles.totalRow}>
              <ThemedText type="smallBold">To pay</ThemedText>
              <ThemedText type="smallBold">{formatPaise(newBill.toPay)}</ThemedText>
            </View>
          </>
        )}
      </View>

      {review.lines.length > 0 ? (
        <Button
          testID="accept-review"
          label={`Place order · ${formatPaise(newBill.toPay)}`}
          onPress={onAccept}
        />
      ) : (
        <ThemedText type="smallBold" style={{ color: theme.bad }}>
          Everything in your cart is gone. Sorry!
        </ThemedText>
      )}
      <Button label="Edit cart instead" variant="secondary" onPress={onEdit} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    gap: Spacing.three,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  list: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dim: {
    opacity: 0.6,
  },
  unit: {
    fontSize: 12,
    lineHeight: 16,
  },
  rowBody: {
    flex: 1,
    gap: Spacing.one,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  amounts: {
    alignItems: 'flex-end',
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  totals: {
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    gap: Spacing.one,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
