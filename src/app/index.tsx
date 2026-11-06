import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ConnectionBar } from '@/components/connection-bar';
import { ProductCard } from '@/components/product-card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { billFor } from '@/domain/bill';
import { formatPaise } from '@/domain/money';
import { categories } from '@/domain/seed-catalog';
import type { CategoryId, Product } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useCart } from '@/store/app';

function ShopHeader({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.headerBlock}>
      <View style={styles.deliveryRow}>
        <View style={styles.deliveryText}>
          <ThemedText type="small" themeColor="textSecondary">
            Delivery in
          </ThemedText>
          <ThemedText style={styles.eta}>11 minutes</ThemedText>
          <View style={styles.address}>
            <Ionicons name="location-sharp" size={14} color={theme.accent} />
            <ThemedText type="small" numberOfLines={1}>
              Home · HSR Layout, Bengaluru
            </ThemedText>
            <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
          </View>
        </View>
        <View style={[styles.brand, { backgroundColor: theme.accent }]}>
          <ThemedText type="smallBold" style={{ color: theme.accentText }}>
            Driftcart
          </ThemedText>
        </View>
      </View>

      <View
        style={[styles.search, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Ionicons name="search" size={18} color={theme.textSecondary} />
        <TextInput
          value={query}
          onChangeText={onQuery}
          placeholder="Search for milk, bread, chips…"
          placeholderTextColor={theme.textSecondary}
          style={[styles.searchInput, { color: theme.text }]}
          accessibilityLabel="Search products"
        />
        {query.length > 0 && (
          <Pressable onPress={() => onQuery('')} accessibilityLabel="Clear search" hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function CategoryTabs({
  selected,
  onSelect,
}: {
  selected: CategoryId | 'all';
  onSelect: (c: CategoryId | 'all') => void;
}) {
  const theme = useTheme();
  const tabs = [{ id: 'all' as const, name: 'All' }, ...categories];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
      {tabs.map((t) => {
        const active = t.id === selected;
        return (
          <Pressable
            key={t.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(t.id)}
            style={[
              styles.tab,
              {
                backgroundColor: active ? theme.accentSoft : theme.backgroundElement,
                borderColor: active ? theme.accent : theme.border,
              },
            ]}>
            <ThemedText type="smallBold" style={{ color: active ? theme.accent : theme.text }}>
              {t.name}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ProductGrid({ products }: { products: Product[] }) {
  return (
    <View style={styles.grid}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </View>
  );
}

export default function ShopScreen() {
  const theme = useTheme();
  const catalog = useCart((s) => s.catalog);
  const lines = useCart((s) => s.lines);
  const fetchedAt = useCart((s) => s.catalogFetchedAt);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId | 'all'>('all');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(catalog).filter(
      (p) =>
        (category === 'all' || p.category === category) &&
        (!q || p.name.toLowerCase().includes(q) || p.category.includes(q)),
    );
  }, [catalog, query, category]);

  const items = lines.reduce((n, l) => n + l.qty, 0);
  const { itemTotal } = billFor(lines.map((l) => ({ qty: l.qty, pricePaise: l.pricePaiseSeen })));
  const grouped = category === 'all' && !query.trim();

  return (
    <Screen
      header={<ShopHeader query={query} onQuery={setQuery} />}
      footer={
        items > 0 && (
          <Pressable
            testID="view-cart"
            accessibilityRole="button"
            onPress={() => router.navigate('/cart')}
            style={({ pressed }) => [
              styles.cartBar,
              { backgroundColor: theme.accent, opacity: pressed ? 0.9 : 1 },
            ]}>
            <View>
              <ThemedText type="small" style={{ color: theme.accentText }}>
                {items} item{items === 1 ? '' : 's'}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: theme.accentText }}>
                {formatPaise(itemTotal)}
              </ThemedText>
            </View>
            <View style={styles.cartBarCta}>
              <ThemedText type="smallBold" style={{ color: theme.accentText }}>
                View cart
              </ThemedText>
              <Ionicons name="chevron-forward" size={18} color={theme.accentText} />
            </View>
          </Pressable>
        )
      }>
      <ConnectionBar />
      <CategoryTabs selected={category} onSelect={setCategory} />

      {!fetchedAt && Object.keys(catalog).length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Loading the store…
        </ThemedText>
      )}

      {grouped ? (
        categories.map((c) => {
          const inCategory = visible.filter((p) => p.category === c.id);
          if (inCategory.length === 0) return null;
          return (
            <View key={c.id} style={styles.section}>
              <ThemedText style={styles.sectionTitle}>{c.name}</ThemedText>
              <ProductGrid products={inCategory} />
            </View>
          );
        })
      ) : visible.length > 0 ? (
        <ProductGrid products={visible} />
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          No products match “{query}”.
        </ThemedText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    gap: Spacing.three,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  deliveryText: {
    flex: 1,
  },
  eta: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 800,
  },
  address: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  brand: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  tabs: {
    gap: Spacing.two,
    paddingRight: Spacing.three,
  },
  tab: {
    borderWidth: 1,
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
  },
  section: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  cartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + Spacing.half,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cartBarCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
