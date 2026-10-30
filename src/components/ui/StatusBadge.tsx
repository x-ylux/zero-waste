import React from "react";

export function StatusBadge({
  status,
  type = "donation",
}: {
  status: string;
  type?: "donation" | "allocation" | "assignment" | "offer";
}) {
  let badgeStyle = "bg-warmgray-100 text-warmgray-800 border-warmgray-300";

  switch (status) {
    case "OPEN":
    case "ACCEPTED":
      badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold";
      break;
    case "PARTIALLY_ALLOCATED":
      badgeStyle = "bg-blue-50 text-blue-800 border-blue-300 font-semibold";
      break;
    case "FULLY_ALLOCATED":
    case "ASSIGNED":
      badgeStyle = "bg-indigo-50 text-indigo-800 border-indigo-300 font-semibold";
      break;
    case "AWAITING_VOLUNTEER":
    case "OFFERED":
    case "PENDING":
      badgeStyle = "bg-amber-50 text-amber-800 border-amber-300 font-semibold";
      break;
    case "COLLECTED":
      badgeStyle = "bg-purple-50 text-purple-800 border-purple-300 font-semibold";
      break;
    case "DELIVERED":
    case "COMPLETED":
    case "CLOSED":
      badgeStyle = "bg-green-100 text-green-900 border-green-400 font-bold";
      break;
    case "PARTIALLY_DELIVERED":
      badgeStyle = "bg-yellow-100 text-yellow-900 border-yellow-400 font-semibold";
      break;
    case "CANCELLED":
    case "DECLINED":
    case "TIMED_OUT":
    case "EXPIRED":
    case "REJECTED":
    case "FAILED":
      badgeStyle = "bg-rose-50 text-rose-800 border-rose-300 font-medium";
      break;
    default:
      badgeStyle = "bg-warmgray-100 text-warmgray-700 border-warmgray-300";
  }

  const formatLabel = (val: string) => {
    return val
      .split("_")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${badgeStyle}`}
    >
      {formatLabel(status)}
    </span>
  );
}

