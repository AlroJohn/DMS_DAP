import React from 'react';
import CircularTextWithLoading from '../react-bits/CircularTextWithLoading';

export function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/60 backdrop-blur-lg z-50">
      <div className="animate-in zoom-in-50 duration-300">
        <CircularTextWithLoading 
          text="Document Management System "
          spinDuration={15}
          onHover="speedUp"
          className="text-foreground shadow-2xl"
        />
      </div>
    </div>
  );
}

// For use in specific areas rather than full screen
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[200px] bg-background/60 backdrop-blur-lg rounded-lg z-30 relative">
      <div className="animate-in zoom-in-50 duration-300">
        <CircularTextWithLoading 
          text="Document Management System "
          spinDuration={15}
          onHover="speedUp"
          className="text-foreground shadow-2xl"
        />
      </div>
    </div>
  );
}