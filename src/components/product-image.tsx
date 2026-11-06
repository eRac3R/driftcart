import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { productImages } from '@/domain/product-images';
import { useTheme } from '@/hooks/use-theme';

type Props = { productId: string; size?: number; style?: StyleProp<ViewStyle>; dimmed?: boolean };

export function ProductImage({ productId, size, style, dimmed }: Props) {
  const theme = useTheme();
  const source = productImages[productId];
  return (
    <View
      style={[
        styles.frame,
        { backgroundColor: theme.backgroundSelected },
        size ? { width: size, height: size, borderRadius: size / 5 } : styles.fill,
        style,
      ]}>
      {source && (
        <Image
          source={source}
          style={[StyleSheet.absoluteFill, dimmed && styles.dimmed]}
          contentFit="cover"
          transition={150}
          accessibilityIgnoresInvertColors
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
  },
  dimmed: {
    opacity: 0.35,
  },
});
