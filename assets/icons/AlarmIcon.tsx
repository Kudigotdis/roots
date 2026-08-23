import React from 'react';

export interface AlarmIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

export const AlarmIcon: React.FC<AlarmIconProps> = ({
  size = 24,
  color = 'currentColor',
  className = '',
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill={color}
      color={color}
      className={className}
      {...props}
    >
      <path d="M32 9 C30.6 9 29.5 10.1 29.5 11.5 L29.5 13.2 C22.8 14.8 18 20.8 18 28.5 C18 36.5 16 39.5 13.8 42 C12.8 43.1 13.4 45 15 45 L49 45 C50.6 45 51.2 43.1 50.2 42 C48 39.5 46 36.5 46 28.5 C46 20.8 41.2 14.8 34.5 13.2 L34.5 11.5 C34.5 10.1 33.4 9 32 9 Z" />
      <path d="M26.5 48 C27.2 51.5 29.3 54 32 54 C34.7 54 36.8 51.5 37.5 48 Z" />
      <path d="M10 20 C7 23.5 5.5 28 5.5 33" stroke={color} strokeWidth={3.5} strokeLinecap="round" fill="none" />
      <path d="M54 20 C57 23.5 58.5 28 58.5 33" stroke={color} strokeWidth={3.5} strokeLinecap="round" fill="none" />
    </svg>
  );
};

export default AlarmIcon;