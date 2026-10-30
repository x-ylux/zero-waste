"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useDemo } from "@/components/providers/DemoProvider";
import { DonationStatusBadge, TaskStatusBadge } from "@/components/ui/StatusBadge";
import { FAILURE_LABELS } from "@/lib/domain/labels";
import type { DonationStatus, TaskStatus } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function AdminPage() {
  const { state, reassignTask } = useDemo();
  const [donationStatus, setDonationStatus] = useState<DonationStatus | "all">("all");
  const [taskStatus, setTaskStatus] = useState<TaskStatus | "all">("all");
  const [fromDate, setFromDate] = useState("");
  const [volunteerId, setVolunteerId] = useState(state.volunteers[1]?.id ?? "");

  const donations = useMemo(() => {
    return state.donations.filter((item) => {
      if (donationStatus !== "all" && item.status !== donationStatus) return false;
      if (fromDate && new Date(item.createdAt) < new Date(fromDate)) return false;
      return true;
    });
  }, [state.donations, donationStatus, fromDate]);

  const tasks = useMemo(() => {
    return state.tasks.filter((item) => (taskStatus === "all" ? true : item.status === taskStatus));
  }, [state.tasks, taskStatus]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap justify-between gap-3">
          <h1 className="text-2xl font-bold">Administrator dashboard</h1>
          <Link href="/admin/impact" className="text-sm font-medium text-brand-800">
            Impact & failure analytics
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-medium">
            Donation status
            <select className="mt-1 w-full rounded-lg border px-2 py-2" value={donationStatus} onChange={(e) => setDonationStatus(e.target.value as DonationStatus | "all")}>
              <option value="all">All</option>
              {["available", "reserved", "collected", "delivered", "cancelled", "expired", "rejected"].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Task status
            <select className="mt-1 w-full rounded-lg border px-2 py-2" value={taskStatus} onChange={(e) => setTaskStatus(e.target.value as TaskStatus | "all")}>
              <option value="all">All</option>
              {["unassigned", "assigned", "picked_up", "delivered", "backup_needed", "cancelled"].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Created after
            <input type="date" className="mt-1 w-full rounded-lg border px-2 py-2" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
        </div>

        <section className="rounded-2xl border border-cream-200 bg-white p-4">
          <h2 className="font-semibold">Donations</h2>
          <ul className="mt-3 space-y-2">
            {donations.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cream-50 px-3 py-2 text-sm">
                <span>{item.title}</span>
                <DonationStatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-cream-200 bg-white p-4">
            <h2 className="font-semibold">NGOs</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {state.ngos.map((ngo) => (
                <li key={ngo.id}>{ngo.name} · max {ngo.maxAcceptableQuantity}</li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-cream-200 bg-white p-4">
            <h2 className="font-semibold">Volunteers</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {state.volunteers.map((vol) => (
                <li key={vol.id}>
                  {vol.name} · {vol.transportType} · {vol.standby ? "standby" : "standard"} · {vol.available ? "available" : "off"}
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="rounded-2xl border border-cream-200 bg-white p-4">
          <h2 className="font-semibold">Rescue tasks</h2>
          <ul className="mt-3 space-y-3">
            {tasks.map((task) => {
              const donation = state.donations.find((item) => item.id === task.donationId);
              return (
                <li key={task.id} className="rounded-xl border border-cream-100 p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>{donation?.title ?? task.donationId}</span>
                    <TaskStatusBadge status={task.status} />
                  </div>
                  {(task.status === "unassigned" || task.status === "backup_needed" || task.status === "assigned") && (
                    <form
                      className="mt-2 flex flex-wrap gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        reassignTask(task.id, volunteerId);
                      }}
                    >
                      <select className="rounded-lg border px-2 py-1" value={volunteerId} onChange={(e) => setVolunteerId(e.target.value)}>
                        {state.volunteers.map((vol) => (
                          <option key={vol.id} value={vol.id}>{vol.name}</option>
                        ))}
                      </select>
                      <button type="submit" className="rounded-lg bg-brand-700 px-3 py-1 text-white">
                        Reassign
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl border border-cream-200 bg-white p-4">
          <h2 className="font-semibold">Handoff records</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {state.handoffs.map((event) => (
              <li key={event.id}>
                {event.stage} · {event.method} · {formatDateTime(event.createdAt)} · donation {event.donationId}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-cream-200 bg-white p-4">
          <h2 className="font-semibold">Reported incidents</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {state.incidents.map((item) => (
              <li key={item.id} className="rounded-xl bg-cream-50 px-3 py-2">
                <p className="font-medium">{item.title}</p>
                <p>{item.description}</p>
                <p className="text-xs text-warmgray-500">{item.status} · {formatDateTime(item.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-cream-200 bg-white p-4">
          <h2 className="font-semibold">Failed-rescue reasons</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {state.failures.map((item) => (
              <li key={item.id}>
                {FAILURE_LABELS[item.reason]} — {item.notes}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
