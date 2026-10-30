import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Activity,
  UserX,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/auth/login");
  }

  // Fetch pending or recent verifications
  const verifications = await prisma.organisationVerification.findMany({
    include: { organisation: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Fetch incidents
  const incidents = await prisma.incident.findMany({
    include: {
      reporter: { select: { name: true, email: true } },
      allocation: { include: { ngoOrg: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Fetch recent audit events
  const auditEvents = await prisma.auditEvent.findMany({
    include: { actor: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  return (
    <div className="space-y-8 py-2">
      <div className="pb-4 border-b border-warmgray-200">
        <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
          System Administration
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-warmgray-900 tracking-tight">
          Governance, Verifications & Incident Oversight
        </h1>
        <p className="text-xs text-warmgray-600 mt-1">
          Review legal partner credentials, investigate flagged safety reports, and review immutable audit records.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Organisation Verifications */}
        <div className="bg-white p-6 rounded-2xl border border-warmgray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-warmgray-100">
            <h2 className="text-sm font-bold text-warmgray-900 uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-brand-700" />
              Organisation Verifications ({verifications.length})
            </h2>
          </div>

          {verifications.length === 0 ? (
            <p className="text-xs text-warmgray-500 italic py-4">No pending verifications.</p>
          ) : (
            <div className="divide-y divide-warmgray-100">
              {verifications.map((v) => (
                <div key={v.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-warmgray-900 text-sm block">
                      {v.organisation.name}
                    </span>
                    <span className="text-warmgray-500 text-[11px]">
                      Doc: {v.documentType} ({v.documentNumber})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.verificationStatus === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : v.verificationStatus === "REJECTED"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {v.verificationStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incidents & Food Safety Concerns */}
        <div className="bg-white p-6 rounded-2xl border border-warmgray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-warmgray-100">
            <h2 className="text-sm font-bold text-warmgray-900 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              Incidents & Escalations ({incidents.length})
            </h2>
          </div>

          {incidents.length === 0 ? (
            <p className="text-xs text-warmgray-500 italic py-4">
              No active operational incidents or safety flags reported.
            </p>
          ) : (
            <div className="divide-y divide-warmgray-100">
              {incidents.map((inc) => (
                <div key={inc.id} className="py-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-warmgray-900 text-sm">{inc.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inc.severity === "HIGH" || inc.severity === "CRITICAL"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {inc.severity}
                    </span>
                  </div>
                  <p className="text-warmgray-600">{inc.description}</p>
                  <div className="flex items-center justify-between text-[11px] text-warmgray-400 pt-1">
                    <span>Reported by: {inc.reporter?.name || "System Worker"}</span>
                    <span>Status: <strong>{inc.status}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Immutable Audit Trail */}
      <div className="bg-white p-6 rounded-2xl border border-warmgray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-warmgray-100">
          <h2 className="text-sm font-bold text-warmgray-900 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-700" />
            Audit Event Stream (Zero Deletion Ledger)
          </h2>
          <span className="text-[11px] text-warmgray-500">Live Database Audit Log</span>
        </div>

        <div className="divide-y divide-warmgray-100">
          {auditEvents.map((ae) => (
            <div key={ae.id} className="py-2.5 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-brand-800 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 text-[11px]">
                    {ae.action}
                  </span>
                  <span className="text-warmgray-700">
                    {ae.entityType} ({ae.entityId.slice(0, 12)}...)
                  </span>
                </div>
                {ae.reason && (
                  <p className="text-[11px] text-warmgray-500 italic">
                    Reason: {ae.reason}
                  </p>
                )}
              </div>

              <div className="text-right text-[11px] text-warmgray-400">
                <span>{ae.actor?.name || "System"}</span>
                <span className="block">
                  {new Date(ae.createdAt).toLocaleTimeString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
