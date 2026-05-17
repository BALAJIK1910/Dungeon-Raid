import React from 'react';

const HudButton = ({ children, variant = 'primary', className = '', ...props }) => {
  let variantClass = '';
  if (variant === 'danger') variantClass = 'hud-btn--danger';
  else if (variant === 'success') variantClass = 'hud-btn--success';
  
  return (
    <button className={`hud-btn ${variantClass} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default HudButton;
