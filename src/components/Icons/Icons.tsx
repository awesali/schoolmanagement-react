import React from 'react';

export type IconProps = React.SVGProps<SVGSVGElement> & { size?: number | string };

export const PreviewIcon: React.FC<IconProps> = ({ size = 20, style, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false" style={{ flexShrink: 0, verticalAlign: 'middle', ...style }} {...props}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const AddCircleIcon: React.FC<IconProps> = ({ size = 20, style, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 50 50"
    fill="currentColor" aria-hidden="true" focusable="false"
    style={{ flexShrink: 0, verticalAlign: 'middle', ...style }} {...props}>
    <path d="M 25 2 C 12.309295 2 2 12.309295 2 25 C 2 37.690705 12.309295 48 25 48 C 37.690705 48 48 37.690705 48 25 C 48 12.309295 37.690705 2 25 2 z M 25 4 C 36.609824 4 46 13.390176 46 25 C 46 36.609824 36.609824 46 25 46 C 13.390176 46 4 36.609824 4 25 C 4 13.390176 13.390176 4 25 4 z M 24 13 L 24 24 L 13 24 L 13 26 L 24 26 L 24 37 L 26 37 L 26 26 L 37 26 L 37 24 L 26 24 L 26 13 L 24 13 z" />
  </svg>
);

export const LoadIcon: React.FC<IconProps> = ({ size = 20, style, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false" style={{ flexShrink: 0, verticalAlign: 'middle', ...style }} {...props}>
    <path d="M20 7v5h-5M4 17v-5h5" />
    <path d="M6.1 6.1a8 8 0 0 1 13.2 3.1L20 12M4 12l.7 2.8a8 8 0 0 0 13.2 3.1" />
  </svg>
);
