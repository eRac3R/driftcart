import { NativeTabs } from 'expo-router/native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useCart } from '@/store/app';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const items = useCart((s) => s.lines.reduce((n, l) => n + l.qty, 0));
  const needsAttention = useCart((s) => s.phase === 'review' || s.phase === 'queued');

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Shop</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bag" md="storefront" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="cart">
        <NativeTabs.Trigger.Label>Cart</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="cart" md="shopping_cart" />
        <NativeTabs.Trigger.Badge hidden={items === 0 && !needsAttention}>
          {needsAttention ? '!' : String(items)}
        </NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="lab">
        <NativeTabs.Trigger.Label>Lab</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="flask" md="science" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
