import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  qty: number;
  onAdd: () => void;
  onRemove: () => void;
  disabled?: boolean;
  label: string;
};

export function QtyStepper({ qty, onAdd, onRemove, disabled, label }: Props) {
  const theme = useTheme();

  if (qty === 0) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add ${label}`}
        disabled={disabled}
        onPress={onAdd}
        style={({ pressed }) => [
          styles.box,
          styles.add,
          {
            borderColor: theme.accent,
            backgroundColor: pressed ? theme.accentSoft : theme.backgroundElement,
            opacity: disabled ? 0.45 : 1,
          },
        ]}>
        <ThemedText type="smallBold" style={[styles.addText, { color: theme.accent }]}>
          ADD
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <View style={[styles.box, { backgroundColor: theme.accent, opacity: disabled ? 0.45 : 1 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove one ${label}`}
        disabled={disabled}
        onPress={onRemove}
        hitSlop={8}
        style={styles.signHit}>
        <ThemedText type="smallBold" style={[styles.sign, { color: theme.accentText }]}>
          −
        </ThemedText>
      </Pressable>
      <ThemedText type="smallBold" style={{ color: theme.accentText }}>
        {qty}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add one ${label}`}
        disabled={disabled}
        onPress={onAdd}
        hitSlop={8}
        style={styles.signHit}>
        <ThemedText type="smallBold" style={[styles.sign, { color: theme.accentText }]}>
          +
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 34,
    minWidth: 76,
    borderRadius: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  add: {
    borderWidth: 1.5,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  addText: {
    letterSpacing: 0.6,
  },
  signHit: {
    paddingHorizontal: Spacing.one + Spacing.half,
  },
  sign: {
    fontSize: 18,
  },
});
