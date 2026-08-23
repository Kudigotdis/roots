import React from 'react';

export interface ProfilePictureIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

export const ProfilePictureIcon: React.FC<ProfilePictureIconProps> = ({
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
      <path d="M32 6 C17.6 6 6 17.6 6 32 C6 46.4 17.6 58 32 58 C46.4 58 58 46.4 58 32 C58 17.6 46.4 6 32 6 Z M32 17 C28.1 17 25 20.1 25 24 C25 27.9 28.1 31 32 31 C35.9 31 39 27.9 39 24 C39 20.1 35.9 17 32 17 Z M17.5 49.5 C19.5 42 25 37.5 32 37.5 C39 37.5 44.5 42 46.5 49.5 C42.5 53 37.5 55 32 55 C26.5 55 21.5 53 17.5 49.5 Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
};

export default ProfilePictureIcon;