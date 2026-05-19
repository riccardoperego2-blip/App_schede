import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { View } from 'react-native';
import { colors } from '../../theme';

interface TrendSparklineProps {
  values: number[];
  width?: number;
  height?: number;
}

/** Lightweight volume trend line with soft fill — no chart library. */
export function TrendSparkline({ values, width = 300, height = 80 }: TrendSparklineProps) {
  if (values.length < 2) return null;

  const padX = 4;
  const padY = 10;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = values.map((value, index) => ({
    x: padX + (index / (values.length - 1)) * innerW,
    y: padY + innerH - ((value - min) / range) * innerH,
  }));

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? padX} ${height - 2} L ${points[0]?.x ?? padX} ${height - 2} Z`;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.22} />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#trendFill)" />
        <Path
          d={linePath}
          stroke={colors.primary}
          strokeWidth={2.5}
          strokeOpacity={0.35}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d={linePath}
          stroke={colors.primary}
          strokeWidth={1.75}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
