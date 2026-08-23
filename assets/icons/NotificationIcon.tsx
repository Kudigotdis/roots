import React from 'react';

export interface NotificationIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

export const NotificationIcon: React.FC<NotificationIconProps> = ({
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
      <path d="M32 6 A3.5 3.5 0 1 1 32 13 A3.5 3.5 0 1 1 32 6 Z" />
      <path d="M32 13 C22.5 13 16 20 16 30 C16 37.5 13.8 41 10.5 43.8 C9.5 44.6 10 46 11.5 46 L52.5 46 C54 46 54.5 44.6 53.5 43.8 C50.2 41 48 37.5 48 30 C48 20 41.5 13 32 13 Z" />
      <path d="M26 48 C26.8 52 29.2 55 32 55 C34.8 55 37.2 52 38 48 Z" />
    </svg>
  );
};

export default NotificationIcon;