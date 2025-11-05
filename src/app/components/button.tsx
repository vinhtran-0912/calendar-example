import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "icon"
    | "icon-small"
    | "icon-large"
    | "primary"
    | "default"
    | "unstyled";
  children?: React.ReactNode;
  childrenClassName?: string;
  loading?: boolean;
}

export default function Button({
  variant = "default",
  children,
  className = "",
  childrenClassName = "",
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    "cursor-pointer flex items-center justify-center rounded-full transition-colors hover:bg-gray-50";

  const variantClasses = {
    "icon-small": "h-4 w-4 min-w-4 bg-gray-500 hover:bg-gray-400 hover:border-none",
    icon: "h-6 w-6 min-w-6",
    "icon-large": "size-8",
    primary:
      "bg-black text-white hover:bg-blue-700 text-sm leading-none px-4 py-2 h-8 hover:bg-gray-700",
    unstyled:
      "bg-transparent text-gray-400 hover:bg-gray-50 p-0 h-8 border-none hover:text-purple-600 hover:bg-transparent",
    default:
      "bg-white text-gray-400 hover:bg-gray-50 px-4 py-2 h-8 border border-gray-300",
  } as const;

  const iconSizeClasses = {
    "icon-small": "text-[10px] leading-none text-white",
    icon: "text-sm leading-none",
    "icon-large": "text-base leading-none",
    primary: "text-sm leading-none",
    default: "text-sm leading-none",
    unstyled: "text-sm leading-none",
  } as const;

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${
        loading ? "opacity-70 cursor-not-allowed" : ""
      } ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          className={`inline-block ${
            variant === "primary" ? "border-white" : "border-gray-400"
          } border-2 border-t-transparent rounded-full animate-spin ${
            variant === "icon-small" ? "size-3" : "size-4"
          }`}
        />
      ) : (
        children && (
          <span className={`${iconSizeClasses[variant]} ${childrenClassName}`}>
            {children}
          </span>
        )
      )}
    </button>
  );
}
