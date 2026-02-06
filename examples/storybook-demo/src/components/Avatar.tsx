import React from 'react';

export interface AvatarProps {
  /** Image source URL */
  src?: string;
  /** Alt text or initials to show when no image */
  name: string;
  /** Avatar size */
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  /** Shape variant */
  shape?: 'circle' | 'rounded' | 'square';
  /** Status indicator */
  status?: 'online' | 'offline' | 'busy' | 'away';
}

const sizeValues: Record<string, { size: string; fontSize: string }> = {
  small: { size: '32px', fontSize: '12px' },
  medium: { size: '40px', fontSize: '14px' },
  large: { size: '56px', fontSize: '18px' },
  xlarge: { size: '80px', fontSize: '24px' },
};

const statusColors: Record<string, string> = {
  online: '#22c55e',
  offline: '#9ca3af',
  busy: '#ef4444',
  away: '#f59e0b',
};

const radiusValues: Record<string, string> = {
  circle: '50%',
  rounded: '8px',
  square: '0',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];
  return colors[Math.abs(hash) % colors.length];
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'medium',
  shape = 'circle',
  status,
}) => {
  const sizeStyle = sizeValues[size];

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
  };

  const avatarStyle: React.CSSProperties = {
    width: sizeStyle.size,
    height: sizeStyle.size,
    borderRadius: radiusValues[shape],
    backgroundColor: stringToColor(name),
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: sizeStyle.fontSize,
    fontWeight: 600,
    overflow: 'hidden',
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  const statusStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '0',
    right: '0',
    width: size === 'small' ? '8px' : size === 'xlarge' ? '16px' : '12px',
    height: size === 'small' ? '8px' : size === 'xlarge' ? '16px' : '12px',
    borderRadius: '50%',
    backgroundColor: status ? statusColors[status] : 'transparent',
    border: '2px solid white',
  };

  return (
    <div style={containerStyle}>
      <div style={avatarStyle}>
        {src ? (
          <img src={src} alt={name} style={imageStyle} />
        ) : (
          getInitials(name)
        )}
      </div>
      {status && <span style={statusStyle} />}
    </div>
  );
};
