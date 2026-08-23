import React from 'react';

export interface ChatBubbleIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

export const ChatBubbleIcon: React.FC<ChatBubbleIconProps> = ({
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
      <path d="M32 7 C17.6 7 6 17.5 6 30.5 C6 36.5 8.7 42 13.2 46 C12.2 49.5 10 52.8 7.3 55.2 C6.8 55.7 7.1 56.5 7.8 56.5 C13.5 56.5 18.8 53.8 22.4 51.2 C25.4 52.3 28.6 53 32 53 C46.4 53 58 42.5 58 30.5 C58 17.5 46.4 7 32 7 Z M23 27 A3.5 3.5 0 1 0 23 34 A3.5 3.5 0 1 0 23 27 Z M32 27 A3.5 3.5 0 1 0 32 34 A3.5 3.5 0 1 0 32 27 Z M41 27 A3.5 3.5 0 1 0 41 34 A3.5 3.5 0 1 0 41 27 Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
};

export default ChatBubbleIcon;