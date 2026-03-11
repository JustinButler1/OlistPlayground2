import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import {
    useDerivedValue,
    useFrameCallback,
    useSharedValue,
    type FrameInfo,
} from 'react-native-reanimated';

const DEFAULT_AURORA_COLORS = ['#4e2899', '#139ec1', '#1a5e85'] as const;
const DEFAULT_SKY_COLORS = ['#051223', '#2a1b60'] as const;

const SHADER_SOURCE = `
uniform float2 resolution;
uniform float time;
uniform float3 color1;
uniform float3 color2;
uniform float3 color3;
uniform float3 skyTop;
uniform float3 skyBottom;
uniform float speed;
uniform float intensity;
uniform float2 waveDirection;

float bandStrength(float y, float center, float feather) {
  return 1.0 - smoothstep(0.0, feather, abs(y - center));
}

half4 main(float2 xy) {
  float2 uv = xy / resolution;
  float t = time * speed;

  float3 sky = mix(skyTop, skyBottom, smoothstep(0.0, 1.0, uv.y));

  float dirX = waveDirection.x * 0.08;
  float dirY = waveDirection.y * 0.08;

  float center1 = 0.30 + sin(uv.x * 6.2 + uv.y * dirY + t * 0.75) * 0.10;
  float center2 = 0.48 + sin(uv.x * 4.7 - uv.y * dirX - t * 0.58 + 1.8) * 0.12;
  float center3 = 0.68 + sin(uv.x * 8.4 + uv.y * (dirX - dirY) + t * 0.92 + 3.1) * 0.08;

  float band1 = bandStrength(uv.y, center1, 0.22);
  float band2 = bandStrength(uv.y, center2, 0.18);
  float band3 = bandStrength(uv.y, center3, 0.16);

  float shimmer1 = 0.7 + 0.3 * sin(uv.x * 10.0 + t * 1.3 + uv.y * 3.0);
  float shimmer2 = 0.72 + 0.28 * sin(uv.x * 8.5 - t * 1.1 + uv.y * 2.4);
  float shimmer3 = 0.68 + 0.32 * sin(uv.x * 12.0 + t * 1.6 - uv.y * 2.0);

  float3 aurora =
    color1 * band1 * shimmer1 +
    color2 * band2 * shimmer2 +
    color3 * band3 * shimmer3;

  float horizonGlow = exp(-3.5 * abs(uv.y - 0.58));
  float vignette = smoothstep(1.2, 0.25, distance(uv, float2(0.5, 0.42)));

  float3 finalColor = sky;
  finalColor += aurora * intensity * 0.72;
  finalColor += horizonGlow * 0.035;
  finalColor *= 0.88 + vignette * 0.12;

  return half4(clamp(finalColor, 0.0, 1.0), 1.0);
}
`;

const SHADER = Skia.RuntimeEffect.Make(SHADER_SOURCE);

export type AuroraProps = {
    width?: number;
    height?: number;
    auroraColors?: readonly [string, string, string] | readonly string[];
    skyColors?: readonly [string, string];
    speed?: number;
    intensity?: number;
    waveDirection?: readonly [number, number];
    style?: StyleProp<ViewStyle>;
};

function hexToRgb(hex: string): [number, number, number] {
    const normalized = hex.replace('#', '').trim();
    const expanded =
        normalized.length === 3
            ? normalized
                .split('')
                .map((value) => value + value)
                .join('')
            : normalized;

    if (!/^[\da-fA-F]{6}$/.test(expanded)) {
        return [1, 1, 1];
    }

    const numeric = Number.parseInt(expanded, 16);

    return [
        ((numeric >> 16) & 255) / 255,
        ((numeric >> 8) & 255) / 255,
        (numeric & 255) / 255,
    ];
}

function AuroraComponent({
    width: propWidth,
    height: propHeight,
    auroraColors = DEFAULT_AURORA_COLORS,
    skyColors = DEFAULT_SKY_COLORS,
    speed = 0.5,
    intensity = 1,
    waveDirection = [9, -9],
    style,
}: AuroraProps) {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const width = propWidth ?? screenWidth;
    const height = propHeight ?? screenHeight * 0.25;
    const time = useSharedValue(0);

    useFrameCallback((frameInfo: FrameInfo) => {
        if (frameInfo.timeSincePreviousFrame != null) {
            time.value += frameInfo.timeSincePreviousFrame / 1000;
        }
    });

    const color1 = useMemo(
        () => hexToRgb(auroraColors[0] ?? DEFAULT_AURORA_COLORS[0]),
        [auroraColors]
    );
    const color2 = useMemo(
        () => hexToRgb(auroraColors[1] ?? DEFAULT_AURORA_COLORS[1]),
        [auroraColors]
    );
    const color3 = useMemo(
        () => hexToRgb(auroraColors[2] ?? DEFAULT_AURORA_COLORS[2]),
        [auroraColors]
    );
    const skyTop = useMemo(() => hexToRgb(skyColors[0] ?? DEFAULT_SKY_COLORS[0]), [skyColors]);
    const skyBottom = useMemo(
        () => hexToRgb(skyColors[1] ?? DEFAULT_SKY_COLORS[1]),
        [skyColors]
    );

    const uniforms = useDerivedValue(() => {
        return {
            resolution: [width, height],
            time: time.value,
            color1,
            color2,
            color3,
            skyTop,
            skyBottom,
            speed,
            intensity,
            waveDirection: [waveDirection[0], waveDirection[1]],
        };
    });

    if (!SHADER) {
        return null;
    }

    return (
        <Canvas style={[styles.canvas, { width, height }, style]}>
            <Fill>
                <Shader source={SHADER} uniforms={uniforms} />
            </Fill>
        </Canvas>
    );
}

const Aurora = memo(AuroraComponent);

export default Aurora;

const styles = StyleSheet.create({
    canvas: {
        backgroundColor: 'transparent',
    },
});
