import React from 'react';

export interface DeleteIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

export const DeleteIcon: React.FC<DeleteIconProps> = ({
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
      <path d="M27 9 C27 7.9 27.9 7 29 7 L35 7 C36.1 7 37 7.9 37 9 L37 11 L27 11 Z" />
      <path d="M16.5 11 C15.1 11 14 12.1 14 13.5 C14 14.9 15.1 16 16.5 16 L47.5 16 C48.9 16 50 14.9 50 13.5 C50 12.1 48.9 11 47.5 11 Z" />
      <path d="M19 18 L22 51 C22.4 55 25.5 58 29.5 58 L34.5 58 C38.5 58 41.6 55 42 51 L45 18 Z" />
    </svg>
  );
};

export default DeleteIcon;