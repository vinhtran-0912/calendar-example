import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  isDragging?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, isDragging = false, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-md border border-gray-200 bg-white p-2.5 ${
          isDragging ? "opacity-50" : ""
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export default Card;
