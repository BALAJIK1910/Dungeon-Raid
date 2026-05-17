import React from 'react';

const HudPanel = ({ children, className = '', ...props }) => {
  return (
    <div className={`hud-panel ${className}`} {...props}>
      {children}
    </div>
  );
};

export default HudPanel;
