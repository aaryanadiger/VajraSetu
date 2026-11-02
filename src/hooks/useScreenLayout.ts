import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Shared dimensions for the floating navigation and scrollable phone screens. */
export function useScreenLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return {
    compact: width < 360 || height < 700 || fontScale > 1.3,
    horizontalPadding: width < 360 ? 12 : 20,
    bottomClearance: 74 + Math.max(insets.bottom, 12) + 20,
  };
}
