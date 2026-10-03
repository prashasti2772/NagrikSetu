const StatusBadge = ({
  children,
  variant = "default",
  className = "",
}) => {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-orange-50 text-orange-700",
    danger: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default StatusBadge;