import React from 'react';
import { Image, View } from 'react-native';

// The LocalPulse wordmark (transparent background, watermark removed).
export function LogoWordmark({ width = 200 }: { width?: number }) {
  // Source asset is 1393 x 308.
  const height = Math.round(width * (308 / 1393));
  return (
    <View style={{ marginBottom: 18 }}>
      <Image
        source={require('../assets/logo-wordmark.png')}
        style={{ width, height }}
        resizeMode="contain"
        accessibilityLabel="LocalPulse"
      />
    </View>
  );
}
