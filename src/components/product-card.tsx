import { StyleSheet, View } from 'react-native';

import { ProductImage } from '@/components/product-image';
import { QtyStepper } from '@/components/qty-stepper';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatPaise } from '@/domain/money';
import type { Product } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useCart } from '@/store/app';

export function discountPercent(p: Product): number {
  return p.mrpPaise > p.pricePaise ? Math.round((1 - p.pricePaise / p.mrpPaise) * 100) : 0;
}

export function ProductCard({ product }: { product: Product }) {
  const theme = useTheme();
  const qty = useCart((s) => s.lines.find((l) => l.productId === product.id)?.qty ?? 0);
  const locked = useCart((s) => s.isLocked());
  const add = useCart((s) => s.add);
  const remove = useCart((s) => s.remove);
  const soldOut = product.stock <= 0;
  const off = discountPercent(product);

  return (
    <View
      style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      testID={`product-${product.id}`}>
      <View>
        <ProductImage productId={product.id} dimmed={soldOut} />
        {off > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.accent }]}>
            <ThemedText type="smallBold" style={[styles.badgeText, { color: theme.accentText }]}>
              {off}% OFF
            </ThemedText>
          </View>
        )}
        <View style={styles.addSlot}>
          {soldOut ? (
            <View style={[styles.soldOut, { backgroundColor: theme.badBackground }]}>
              <ThemedText type="smallBold" style={[styles.soldOutText, { color: theme.bad }]}>
                Sold out
              </ThemedText>
            </View>
          ) : (
            <QtyStepper
              label={product.name}
              qty={qty}
              disabled={locked}
              onAdd={() => add(product.id)}
              onRemove={() => remove(product.id)}
            />
          )}
        </View>
      </View>

      <View style={styles.body}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.unit}>
          {product.unit}
        </ThemedText>
        <ThemedText type="smallBold" numberOfLines={2} style={styles.name}>
          {product.name}
        </ThemedText>
        {product.stock > 0 && product.stock <= 5 && (
          <ThemedText type="small" style={[styles.left, { color: theme.warn }]}>
            Only {product.stock} left
          </ThemedText>
        )}
        <View style={styles.priceRow}>
          <ThemedText type="smallBold">{formatPaise(product.pricePaise)}</ThemedText>
          {off > 0 && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.mrp}>
              {formatPaise(product.mrpPaise)}
            </ThemedText>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: 150,
    maxWidth: 260,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.two,
  },
  badge: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderTopLeftRadius: 12,
    borderBottomRightRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 15,
  },
  addSlot: {
    position: 'absolute',
    right: Spacing.one,
    bottom: -Spacing.three,
  },
  soldOut: {
    height: 34,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    justifyContent: 'center',
  },
  soldOutText: {
    fontSize: 12,
  },
  body: {
    marginTop: Spacing.four,
    gap: Spacing.half,
  },
  unit: {
    fontSize: 12,
    lineHeight: 16,
  },
  name: {
    minHeight: 40,
  },
  left: {
    fontSize: 12,
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  mrp: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
});
