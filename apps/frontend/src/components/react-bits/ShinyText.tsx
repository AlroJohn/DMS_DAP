import React from 'react';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
}

const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  disabled = false,
  speed = 5,
  className = '',
}) => {
  const animationDuration = `${speed}s`;

  return (
    <span className={`relative inline-block ${className}`}>
      <span>{text}</span>
      {!disabled && (
        <span
          aria-hidden
          className="absolute inset-0 bg-clip-text text-transparent animate-shine"
          style={{
            backgroundImage:
              'linear-gradient(120deg, rgba(255,255,255,0) 35%, var(--shiny-color) 50%, rgba(255,255,255,0) 65%)',
            backgroundSize: '200% 100%',
            animationDuration,
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
};

export default ShinyText;

// tailwind.config.js
// module.exports = {
//   theme: {
//     extend: {
//       keyframes: {
//         shine: {
//           '0%': { 'background-position': '100%' },
//           '100%': { 'background-position': '-100%' },
//         },
//       },
//       animation: {
//         shine: 'shine 5s linear infinite',
//       },
//     },
//   },
//   plugins: [],
// };

