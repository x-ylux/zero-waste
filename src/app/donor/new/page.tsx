"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useDemo } from "@/components/providers/DemoProvider";
import {
  ALLERGEN_LABELS,
  CATEGORY_LABELS,
  DIETARY_LABELS,
  HANDLING_LABELS,
  STORAGE_LABELS,
  UNIT_LABELS,
} from "@/lib/domain/labels";
import type { Allergen, DietaryTag, FoodCategory, HandlingRequirement, QuantityUnit, StorageType } from "@/lib/domain/types";
import { donationFormSchema } from "@/lib/validation/donation";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function CreateDonationPage() {
  const { user, state, createDonation } = useDemo();
  const router = useRouter();
  const org = state.donors.find((item) => item.id === user.orgId);
  const start = useMemo(() => {
    const d = new Date(Date.now() + 30 * 60 * 1000);
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    return d;
  }, []);
  const end = useMemo(() => new Date(start.getTime() + 3 * 60 * 60 * 1000), [start]);
  const toLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [title, setTitle] = useState("Evening surplus trays");
  const [description, setDescription] = useState("Packed trays ready for same-evening pickup.");
  const [category, setCategory] = useState<FoodCategory>("cooked_meals");
  const [quantity, setQuantity] = useState(36);
  const [unit, setUnit] = useState<QuantityUnit>("servings");
  const [portions, setPortions] = useState(36);
  const [dietary, setDietary] = useState<DietaryTag[]>(["vegetarian"]);
  const [allergens, setAllergens] = useState<Allergen[]>(["unknown"]);
  const [preparedAt, setPreparedAt] = useState(toLocal(new Date()));
  const [storage, setStorage] = useState<StorageType>("hot_hold");
  const [handling, setHandling] = useState<HandlingRequirement[]>(["keep_hot", "time_sensitive"]);
  const [packaging, setPackaging] = useState(true);
  const [animalShelterOnly, setAnimalShelterOnly] = useState(false);
  const [address, setAddress] = useState(org?.location.address ?? "");
  const [lat, setLat] = useState(org?.location.lat ?? 12.9352);
  const [lng, setLng] = useState(org?.location.lng ?? 77.6245);
  const [windowStart, setWindowStart] = useState(toLocal(start));
  const [windowEnd, setWindowEnd] = useState(toLocal(end));
  const [contactName, setContactName] = useState(user.name);
  const [contactPhone, setContactPhone] = useState(user.phone ?? "");
  const [photo, setPhoto] = useState<string | undefined>();
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = donationFormSchema.safeParse({
      title,
      description,
      category,
      quantity,
      unit,
      estimatedPortions: portions || undefined,
      dietaryTags: dietary,
      allergens,
      preparedAt: new Date(preparedAt).toISOString(),
      storage,
      handlingRequirements: handling,
      packagingAvailable: packaging,
      animalShelterOnly,
      pickupLocation: { lat, lng, address },
      pickupWindowStart: new Date(windowStart).toISOString(),
      pickupWindowEnd: new Date(windowEnd).toISOString(),
      contactName,
      contactPhone,
      photoDataUrl: photo,
      handlingAcknowledged: ack ? true : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form.");
      return;
    }
    const ok = createDonation(parsed.data);
    if (ok) router.push("/donor");
  }

  return (
    <AppShell>
      <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5 rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Create donation</h1>
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</p>}
        <label className="block text-sm font-medium">
          Food title
          <input className="mt-1 w-full rounded-xl border border-cream-300 px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="block text-sm font-medium">
          Description
          <textarea className="mt-1 w-full rounded-xl border border-cream-300 px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium">
            Category
            <select className="mt-1 w-full rounded-xl border border-cream-300 px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value as FoodCategory)}>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Quantity
            <input type="number" min={1} className="mt-1 w-full rounded-xl border border-cream-300 px-3 py-2" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </label>
          <label className="text-sm font-medium">
            Unit
            <select className="mt-1 w-full rounded-xl border border-cream-300 px-3 py-2" value={unit} onChange={(e) => setUnit(e.target.value as QuantityUnit)}>
              {Object.entries(UNIT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="text-sm font-medium">
          Estimated portions (optional)
          <input type="number" min={1} className="mt-1 w-full rounded-xl border border-cream-300 px-3 py-2" value={portions} onChange={(e) => setPortions(Number(e.target.value))} />
        </label>
        <fieldset>
          <legend className="text-sm font-medium">Dietary tags</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(DIETARY_LABELS) as DietaryTag[]).map((tag) => (
              <label key={tag} className="flex items-center gap-2 rounded-full border border-cream-300 px-3 py-1 text-sm">
                <input type="checkbox" checked={dietary.includes(tag)} onChange={() => setDietary(toggle(dietary, tag))} />
                {DIETARY_LABELS[tag]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-medium">Declared allergens (include Unknown if unsure)</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(ALLERGEN_LABELS) as Allergen[]).map((tag) => (
              <label key={tag} className="flex items-center gap-2 rounded-full border border-cream-300 px-3 py-1 text-sm">
                <input type="checkbox" checked={allergens.includes(tag)} onChange={() => setAllergens(toggle(allergens, tag))} />
                {ALLERGEN_LABELS[tag]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="text-sm font-medium">
          Preparation date and time (optional)
          <input type="datetime-local" className="mt-1 w-full rounded-xl border border-cream-300 px-3 py-2" value={preparedAt} onChange={(e) => setPreparedAt(e.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Storage information
          <select className="mt-1 w-full rounded-xl border border-cream-300 px-3 py-2" value={storage} onChange={(e) => setStorage(e.target.value as StorageType)}>
            {Object.entries(STORAGE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="text-sm font-medium">Handling requirements</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(HANDLING_LABELS) as HandlingRequirement[]).map((tag) => (
              <label key={tag} className="flex items-center gap-2 rounded-full border border-cream-300 px-3 py-1 text-sm">
                <input type="checkbox" checked={handling.includes(tag)} onChange={() => setHandling(toggle(handling, tag))} />
                {HANDLING_LABELS[tag]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={packaging} onChange={(e) => setPackaging(e.target.checked)} />
          Packaging available
        </label>
        <fieldset className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <label className="flex items-start gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="mt-1"
              checked={animalShelterOnly}
              onChange={(event) => setAnimalShelterOnly(event.target.checked)}
            />
            Designate this listing for animal shelters only
          </label>
          {animalShelterOnly && (
            <p className="mt-2 text-xs leading-relaxed text-amber-950">
              Confirm this specific food is suitable for the intended animal species. It will only be shown to animal shelters, and animal-shelter-only donations are excluded from meal and CO₂e estimates.
            </p>
          )}
        </fieldset>
        <label className="text-sm font-medium">
          Pickup address
          <input className="mt-1 w-full rounded-xl border border-cream-300 px-3 py-2" value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Latitude
            <input type="number" step="0.0001" className="mt-1 w-full rounded-xl border border-cream-300 px-3 py-2" value={lat} onChange={(e) => setLat(Number(e.target.value))} />
          </label>
          <label className="text-sm font-medium">
            Longitude
            <input type="number" step="0.0001" className="mt-1 w-full rounded-xl border border-cream-300 px-3 py-2" value={lng} onChange={(e) => setLng(Number(e.target.value))} />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Pickup window start
            <input type="datetime-local" className="mt-1 w-full rounded-xl border border-cream-300 px-3 py-2" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
          </label>
          <label className="text-sm font-medium">
            Pickup window end
            <input type="datetime-local" className="mt-1 w-full rounded-xl border border-cream-300 px-3 py-2" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Contact person
            <input className="mt-1 w-full rounded-xl border border-cream-300 px-3 py-2" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </label>
          <label className="text-sm font-medium">
            Phone
            <input className="mt-1 w-full rounded-xl border border-cream-300 px-3 py-2" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </label>
        </div>
        <label className="text-sm font-medium">
          Optional photo
          <input
            type="file"
            accept="image/*"
            className="mt-1 block w-full text-sm"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setPhoto(String(reader.result));
              reader.readAsDataURL(file);
            }}
          />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          I confirm that storage, handling, and allergen details are donor-declared operational information — not a food-safety certification.
        </label>
        <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white">
          Publish listing
        </button>
      </form>
    </AppShell>
  );
}
