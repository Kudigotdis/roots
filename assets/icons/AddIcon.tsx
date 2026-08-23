import React from 'react';

export interface AddIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

export const AddIcon: React.FC<AddIconProps> = ({
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
      <path d="M32 6 C17.6 6 6 17.6 6 32 C6 46.4 17.6 58 32 58 C46.4 58 58 46.4 58 32 C58 17.6 46.4 6 32 6 Z M32 19 C33.4 19 34.5 20.1 34.5 21.5 L34.5 29.5 L42.5 29.5 C43.9 29.5 45 30.6 45 32 C45 33.4 43.9 34.5 42.5 34.5 L34.5 34.5 L34.5 42.5 C34.5 43.9 33.4 45 32 45 C30.6 45 29.5 43.9 29.5 42.5 L29.5 34.5 L21.5 34.5 C20.1 34.5 19 33.4 19 32 C19 30.6 20.1 29.5 21.5 29.5 L29.5 29.5 L29.5 21.5 C29.5 20.1 30.6 19 32 19 Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
};

export default AddIcon;