"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useDemo } from "@/components/providers/DemoProvider";
import { formatDateTime } from "@/lib/format";

export default function NotificationsPage() {
  const { state, user } = useDemo();
  const items = state.notifications.filter((item) => item.userId === user.id);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-warmgray-600">All messages are simulated in-app notices. Nothing is sent over SMS or email.</p>
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm">No notifications for this demo persona.</p>
        ) : (
          items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-cream-200 bg-white p-4">
              <p className="text-xs uppercase text-amber-800">Simulated · {item.channel}</p>
              <h2 className="font-semibold">{item.title}</h2>
              <p className="text-sm text-warmgray-700">{item.message}</p>
              <p className="text-xs text-warmgray-500">{formatDateTime(item.createdAt)}</p>
            </article>
          ))
        )}
      </div>
    </AppShell>
  );
}
