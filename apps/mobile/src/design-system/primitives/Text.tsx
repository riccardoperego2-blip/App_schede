import { Text as RNText, type TextProps } from 'react-native';
import { cssInterop } from 'nativewind';
import { typography, type TypographyVariant } from '../tokens';

cssInterop(RNText, { className: 'style' });

export interface TextPropsX extends TextProps {
  variant?: TypographyVariant;
  tone?: 'primary' | 'secondary' | 'muted' | 'accent' | 'danger' | 'inverse';
  className?: string;
}

const toneClass: Record<NonNullable<TextPropsX['tone']>, string> = {
  primary: 'text-text-primary',
  secondary: 'text-text-secondary',
  muted: 'text-text-muted',
  accent: 'text-accent',
  danger: 'text-danger',
  inverse: 'text-text-inverse',
};

export function Text({
  variant = 'body',
  tone = 'primary',
  style,
  className = '',
  ...rest
}: TextPropsX) {
  return (
    <RNText
      {...rest}
      style={[typography[variant], style]}
      className={`${toneClass[tone]} ${className}`}
    />
  );
}
