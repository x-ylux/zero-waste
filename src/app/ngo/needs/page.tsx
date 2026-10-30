"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useDemo } from "@/components/providers/DemoProvider";
import {
  CATEGORY_LABELS,
  DIETARY_LABELS,
  HANDLING_LABELS,
  STORAGE_LABELS,
  UNIT_LABELS,
} from "@/lib/domain/labels";
import type { DietaryTag, FoodCategory, HandlingRequirement, QuantityUnit, StorageType } from "@/lib/domain/types";
import { FormEvent, useState } from "react";

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function NeedsPage() {
  const { state, user, saveNeeds } = useDemo();
  const existing = state.needs.find((item) => item.ngoId === user.orgId);
  const [requiredCategories, setRequiredCategories] = useState<FoodCategory[]>(existing?.requiredCategories ?? ["cooked_meals"]);
  const [requestedQuantity, setRequestedQuantity] = useState(existing?.requestedQuantity ?? 100);
  const [quantityUnit, setQuantityUnit] = useState<QuantityUnit>(existing?.quantityUnit ?? "servings");
  const [dietary, setDietary] = useState<DietaryTag[]>(existing?.dietaryRequirements ?? ["vegetarian"]);
  const [start, setStart] = useState(existing?.receivingHoursStart ?? "11:00");
  const [end, setEnd] = useState(existing?.receivingHoursEnd ?? "22:00");
  const [storage, setStorage] = useState<StorageType[]>(existing?.storageCapabilities ?? ["refrigerated"]);
  const [handling, setHandling] = useState<HandlingRequirement[]>(existing?.handlingCapabilities ?? ["keep_cold"]);
  const [maxQty, setMaxQty] = useState(existing?.maxAcceptableQuantity ?? 120);
  const [address, setAddress] = useState(existing?.deliveryAddress.address ?? "");
  const [lat, setLat] = useState(existing?.deliveryAddress.lat ?? 12.97);
  const [lng, setLng] = useState(existing?.deliveryAddress.lng ?? 77.59);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    saveNeeds({
      requiredCategories,
      requestedQuantity,
      quantityUnit,
      dietaryRequirements: dietary,
      receivingHoursStart: start,
      receivingHoursEnd: end,
      storageCapabilities: storage,
      handlingCapabilities: handling,
      maxAcceptableQuantity: maxQty,
      deliveryAddress: { address, lat, lng },
    });
  }

  return (
    <AppShell>
      <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5 rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Needs request</h1>
        <fieldset>
          <legend className="text-sm font-medium">Required food categories</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_LABELS) as FoodCategory[]).map((key) => (
              <label key={key} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                <input type="checkbox" checked={requiredCategories.includes(key)} onChange={() => setRequiredCategories(toggle(requiredCategories, key))} />
                {CATEGORY_LABELS[key]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Requested quantity
            <input type="number" className="mt-1 w-full rounded-xl border px-3 py-2" value={requestedQuantity} onChange={(e) => setRequestedQuantity(Number(e.target.value))} />
          </label>
          <label className="text-sm font-medium">
            Unit
            <select className="mt-1 w-full rounded-xl border px-3 py-2" value={quantityUnit} onChange={(e) => setQuantityUnit(e.target.value as QuantityUnit)}>
              {Object.entries(UNIT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
        </div>
        <fieldset>
          <legend className="text-sm font-medium">Dietary requirements</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(DIETARY_LABELS) as DietaryTag[]).map((key) => (
              <label key={key} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                <input type="checkbox" checked={dietary.includes(key)} onChange={() => setDietary(toggle(dietary, key))} />
                {DIETARY_LABELS[key]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Receiving hours start
            <input type="time" className="mt-1 w-full rounded-xl border px-3 py-2" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="text-sm font-medium">
            Receiving hours end
            <input type="time" className="mt-1 w-full rounded-xl border px-3 py-2" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        <fieldset>
          <legend className="text-sm font-medium">Storage capabilities</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(STORAGE_LABELS) as StorageType[]).map((key) => (
              <label key={key} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                <input type="checkbox" checked={storage.includes(key)} onChange={() => setStorage(toggle(storage, key))} />
                {STORAGE_LABELS[key]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-medium">Handling capabilities</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(HANDLING_LABELS) as HandlingRequirement[]).map((key) => (
              <label key={key} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                <input type="checkbox" checked={handling.includes(key)} onChange={() => setHandling(toggle(handling, key))} />
                {HANDLING_LABELS[key]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="text-sm font-medium">
          Maximum acceptable quantity
          <input type="number" className="mt-1 w-full rounded-xl border px-3 py-2" value={maxQty} onChange={(e) => setMaxQty(Number(e.target.value))} />
        </label>
        <label className="text-sm font-medium">
          Delivery address
          <input className="mt-1 w-full rounded-xl border px-3 py-2" value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Lat
            <input type="number" step="0.0001" className="mt-1 w-full rounded-xl border px-3 py-2" value={lat} onChange={(e) => setLat(Number(e.target.value))} />
          </label>
          <label className="text-sm font-medium">
            Lng
            <input type="number" step="0.0001" className="mt-1 w-full rounded-xl border px-3 py-2" value={lng} onChange={(e) => setLng(Number(e.target.value))} />
          </label>
        </div>
        <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white">
          Save needs
        </button>
      </form>
    </AppShell>
  );
}
