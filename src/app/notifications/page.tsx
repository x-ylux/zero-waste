"use client";

import React, { useState, useEffect } from "react";
import { Bell, CheckCheck, Info, Tag, Clock, ArrowRight } from "lucide-react";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-warmgray-200">
        <div>
          <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
            In-App Messaging
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-warmgray-900 tracking-tight">
            Notifications & Dispatch Alerts
          </h1>
          <p className="text-xs text-warmgray-600 mt-0.5">
            Real database notification records. Simulated channels are clearly identified.
          </p>
        </div>

        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={handleMarkAllRead}
            className="px-3.5 py-1.5 border border-warmgray-300 hover:bg-cream-50 text-warmgray-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-warmgray-500">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-warmgray-200 p-12 text-center max-w-md mx-auto space-y-3">
          <Bell className="w-10 h-10 text-warmgray-400 mx-auto" />
          <h3 className="font-bold text-warmgray-900 text-sm">No Notifications</h3>
          <p className="text-xs text-warmgray-500">
            You do not have any unread system alerts or pickup offers.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border transition text-xs space-y-1.5 ${
                n.isRead
                  ? "bg-white border-warmgray-200"
                  : "bg-brand-50/50 border-brand-200 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-warmgray-900">{n.title}</span>
                <span className="text-[10px] uppercase font-bold text-warmgray-400">
                  {n.simulatedChannel} • {new Date(n.createdAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-warmgray-700">{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
