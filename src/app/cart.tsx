import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ConnectionBar } from '@/components/connection-bar';
import { DriftReview } from '@/components/drift-review';
import { ProductImage } from '@/components/product-image';
import { QtyStepper } from '@/components/qty-stepper';
import { Screen } from '@/components/screen';
import { SyncLog } from '@/components/sync-log';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Pill, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { billFor, FREE_DELIVERY_ABOVE } from '@/domain/bill';
import { formatPaise, lineTotal } from '@/domain/money';
import { useTheme } from '@/hooks/use-theme';
import { useCart } from '@/store/app';
import type { CartStore } from '@/store/cart-store';

function checkoutLabel(s: CartStore, toPay: number) {
  if (s.phase === 'submitting') return 'Placing order…';
  if (s.phase === 'queued') return s.isOnline() ? 'Retry now' : 'Queued · waiting for network';
  return s.isOnline() ? `Place order · ${formatPaise(toPay)}` : `Queue order · ${formatPaise(toPay)}`;
}

function BillRow({ label, value, strike, tone }: { label: string; value: string; strike?: string; tone?: string }) {
  return (
    <View style={styles.billRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.billValue}>
        {strike && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.struck}>
            {strike}
          </ThemedText>
        )}
        <ThemedText type="small" style={tone ? { color: tone, fontWeight: 700 } : undefined}>
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const theme = useTheme();
  const state = useCart((s) => s);
  const { lines, catalog, phase, review, lastOrder } = state;
  const bill = billFor(lines.map((l) => ({ qty: l.qty, pricePaise: l.pricePaiseSeen })));
  const mrpTotal = lines.reduce(
    (n, l) => n + lineTotal(l.qty, Math.max(catalog[l.productId]?.mrpPaise ?? 0, l.pricePaiseSeen)),
    0,
  );
  const savings = mrpTotal - bill.itemTotal;
  const locked = state.isLocked();
  const items = lines.reduce((n, l) => n + l.qty, 0);

  return (
    <Screen title="Checkout" subtitle="Prices stay locked to what you saw until the store confirms.">
      <ConnectionBar />

      {review && (
        <DriftReview
          review={review}
          onAccept={() => void state.acceptReview()}
          onEdit={state.editCart}
        />
      )}

      {phase === 'placed' && lastOrder && (
        <Card style={[styles.placed, { backgroundColor: theme.goodBackground, borderColor: theme.good }]}>
          <Ionicons name="checkmark-circle" size={40} color={theme.good} />
          <ThemedText style={[styles.placedTitle, { color: theme.good }]}>Order placed</ThemedText>
          <ThemedText type="small">
            {lastOrder.orderId} · {formatPaise(lastOrder.totalPaise)} paid · arriving in about 11 minutes
          </ThemedText>
        </Card>
      )}

      {!review && lines.length === 0 && phase !== 'placed' && (
        <Card style={styles.empty}>
          <Ionicons name="bag-handle-outline" size={44} color={theme.textSecondary} />
          <ThemedText type="smallBold">Your cart is empty</ThemedText>
          <Button label="Start shopping" variant="secondary" onPress={() => router.navigate('/')} />
        </Card>
      )}

      {!review && lines.length > 0 && (
        <>
          {savings > 0 && (
            <View style={[styles.savings, { backgroundColor: theme.accentSoft }]}>
              <Ionicons name="pricetag" size={16} color={theme.accent} />
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                You&apos;re saving {formatPaise(savings)} on this order
              </ThemedText>
            </View>
          )}

          <Card>
            <ThemedText type="smallBold">
              {items} item{items === 1 ? '' : 's'} · delivery in 11 minutes
            </ThemedText>
            {lines.map((l) => {
              const current = catalog[l.productId];
              const moved = current && current.pricePaise !== l.pricePaiseSeen;
              return (
                <View key={l.productId} style={styles.line}>
                  <ProductImage productId={l.productId} size={56} />
                  <View style={styles.lineBody}>
                    <ThemedText type="small" numberOfLines={2}>
                      {l.name}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.unit}>
                      {l.unit}
                    </ThemedText>
                    {moved && <Pill label="Price changed · confirms at checkout" tone="warn" />}
                    {!current && <Pill label="No longer sold" tone="bad" />}
                  </View>
                  <View style={styles.lineRight}>
                    <QtyStepper
                      label={l.name}
                      qty={l.qty}
                      disabled={locked}
                      onAdd={() => state.add(l.productId)}
                      onRemove={() => state.remove(l.productId)}
                    />
                    <ThemedText type="smallBold">{formatPaise(lineTotal(l.qty, l.pricePaiseSeen))}</ThemedText>
                  </View>
                </View>
              );
            })}
          </Card>

          <Card>
            <ThemedText type="smallBold">Bill details</ThemedText>
            <BillRow
              label="Item total"
              value={formatPaise(bill.itemTotal)}
              strike={savings > 0 ? formatPaise(mrpTotal) : undefined}
            />
            <BillRow
              label="Delivery fee"
              value={bill.deliveryFee === 0 ? 'FREE' : formatPaise(bill.deliveryFee)}
              strike={bill.deliveryFee === 0 ? formatPaise(2500) : undefined}
              tone={bill.deliveryFee === 0 ? theme.good : undefined}
            />
            {bill.deliveryFee > 0 && (
              <ThemedText type="small" style={[styles.hint, { color: theme.accent }]}>
                Add {formatPaise(FREE_DELIVERY_ABOVE - bill.itemTotal)} more for free delivery
              </ThemedText>
            )}
            <BillRow label="Handling fee" value={formatPaise(bill.handlingFee)} />
            <View style={[styles.toPay, { borderTopColor: theme.border }]}>
              <ThemedText type="smallBold">To pay</ThemedText>
              <ThemedText type="smallBold">{formatPaise(bill.toPay)}</ThemedText>
            </View>
          </Card>

          {locked && phase === 'queued' && (
            <ThemedText type="small" themeColor="textSecondary">
              Cart locked: a request for this order may already have reached the store, so it will be
              retried as-is with the same idempotency key.
            </ThemedText>
          )}
          <Button
            testID="checkout"
            label={checkoutLabel(state, bill.toPay)}
            disabled={phase === 'submitting' || (phase === 'queued' && !state.isOnline())}
            onPress={() => void state.checkout()}
          />
        </>
      )}

      <SectionTitle>Sync activity</SectionTitle>
      <SyncLog />
    </Screen>
  );
}

const styles = StyleSheet.create({
  placed: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  placedTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 800,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
    gap: Spacing.three,
  },
  savings: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 12,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  lineBody: {
    flex: 1,
    gap: Spacing.half,
  },
  unit: {
    fontSize: 12,
    lineHeight: 16,
  },
  lineRight: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billValue: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
  },
  toPay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
  },
});
