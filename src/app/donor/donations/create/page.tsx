"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Utensils,
  PlusCircle,
  AlertCircle,
  Clock,
  MapPin,
  Package,
  Thermometer,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

const FOOD_CATEGORIES = [
  { value: "COOKED_MEALS", label: "Cooked Meals" },
  { value: "PACKAGED_FOOD", label: "Packaged Food" },
  { value: "RAW_PRODUCE", label: "Raw Produce" },
  { value: "BAKERY", label: "Bakery & Breads" },
  { value: "BEVERAGES", label: "Beverages" },
  { value: "DAIRY", label: "Dairy" },
  { value: "OTHER", label: "Other" },
];

const DIETARY_OPTIONS = ["VEGETARIAN", "VEGAN", "NON_VEGETARIAN", "JAIN", "HALAL", "EGG"];
const ALLERGEN_OPTIONS = ["UNKNOWN", "NONE", "GLUTEN", "DAIRY", "PEANUTS", "TREE_NUTS", "SOY", "EGGS", "SHELLFISH"];
const STORAGE_OPTIONS = [
  { value: "AMBIENT", label: "Ambient (Room Temp)" },
  { value: "REFRIGERATED", label: "Refrigerated (< 5°C)" },
  { value: "HOT_HOLD", label: "Hot-Hold Insulated (> 60°C)" },
  { value: "FROZEN", label: "Frozen" },
];
const PACKAGING_OPTIONS = [
  { value: "SEALED_CONTAINERS", label: "Sealed Food-Grade Containers" },
  { value: "FOIL_WRAPPED", label: "Foil Wrapped / Trays" },
  { value: "BULK_VESSELS", label: "Stainless Steel Bulk Canisters" },
  { value: "PACKETED", label: "Individual Packets" },
  { value: "BOXED", label: "Cardboard / Plastic Boxes" },
  { value: "OTHER", label: "Other" },
];

const toDateTimeLocal = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);

export default function CreateDonationPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state initialized with sensible Bengaluru test defaults
  const [title, setTitle] = useState("Corporate Buffet Surplus: Dal Makhani & Jeera Rice");
  const [foodCategory, setFoodCategory] = useState("COOKED_MEALS");
  const [dietaryTags, setDietaryTags] = useState<string[]>(["VEGETARIAN"]);
  const [ingredients, setIngredients] = useState("Black lentils, kidney beans, butter, basmati rice, cumin");
  const [allergens, setAllergens] = useState<string[]>(["DAIRY"]);
  const [storageInfo, setStorageInfo] = useState("HOT_HOLD");
  const [packagingInfo, setPackagingInfo] = useState("SEALED_CONTAINERS");

  const [pickupWindowStart, setPickupWindowStart] = useState("");
  const [pickupWindowEnd, setPickupWindowEnd] = useState("");
  const [preparationTime, setPreparationTime] = useState("");

  useEffect(() => {
    const now = new Date();
    setPickupWindowStart(toDateTimeLocal(new Date(now.getTime() + 60 * 60 * 1000)));
    setPickupWindowEnd(toDateTimeLocal(new Date(now.getTime() + 5 * 60 * 60 * 1000)));
    setPreparationTime(toDateTimeLocal(new Date(now.getTime() - 2 * 60 * 60 * 1000)));
  }, []);

  const [itemName, setItemName] = useState("Dal Makhani & Jeera Rice Meal Box");
  const [quantity, setQuantity] = useState(60);
  const [unit, setUnit] = useState("SERVINGS");
  const [estimatedServings, setEstimatedServings] = useState(60);

  const [pickupAddress, setPickupAddress] = useState(
    "100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038"
  );
  const [latitude, setLatitude] = useState(12.9719);
  const [longitude, setLongitude] = useState(77.6412);
  const [handlingNotes, setHandlingNotes] = useState(
    "Cooked in an FSSAI-licensed commercial kitchen. Packaged directly into food-grade hot-hold containers. Please bring insulated delivery bags."
  );

  const handleDietaryToggle = (opt: string) => {
    setDietaryTags((prev) =>
      prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]
    );
  };

  const handleAllergenToggle = (opt: string) => {
    if (opt === "UNKNOWN" || opt === "NONE") {
      setAllergens([opt]);
      return;
    }
    setAllergens((prev) => {
      const filtered = prev.filter((x) => x !== "UNKNOWN" && x !== "NONE");
      return filtered.includes(opt)
        ? filtered.filter((x) => x !== opt)
        : [...filtered, opt];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const startDate = new Date(pickupWindowStart);
      const endDate = new Date(pickupWindowEnd);

      if (endDate <= startDate) {
        throw new Error("Collection deadline must be strictly after pickup window start.");
      }
      if (endDate <= new Date()) {
        throw new Error("Collection deadline cannot be in the past.");
      }
      if (quantity <= 0) {
        throw new Error("Quantity must be a positive integer.");
      }

      const payload = {
        title,
        foodCategory,
        dietaryTags,
        ingredients,
        allergens,
        storageInfo,
        packagingInfo,
        preparationTime: preparationTime ? new Date(preparationTime).toISOString() : null,
        pickupAddress,
        latitude: Number(latitude),
        longitude: Number(longitude),
        pickupWindowStart: startDate.toISOString(),
        pickupWindowEnd: endDate.toISOString(),
        handlingNotes,
        item: {
          name: itemName,
          quantity: Number(quantity),
          unit,
          estimatedServings: estimatedServings ? Number(estimatedServings) : null,
        },
      };

      const res = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create donation.");
      }

      router.push(`/donations/${data.donation.id}`);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while creating listing.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      <div className="space-y-1">
        <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
          Donor Action
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-warmgray-900 tracking-tight">
          Publish Surplus Food Batch
        </h1>
        <p className="text-xs text-warmgray-600">
          Declare item specifications, storage constraints, and strict collection windows.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-warmgray-200 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Basic Title & Category */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-warmgray-900 uppercase tracking-wider pb-2 border-b border-warmgray-100 flex items-center gap-2">
            <Utensils className="w-4 h-4 text-brand-700" />
            1. Food Identification & Dietary Attributes
          </h2>

          <div>
            <label htmlFor="listing-title" className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
              Listing Title *
            </label>
            <input
              id="listing-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="e.g. Lunch Surplus: Rice & Dal Boxes"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
                Food Category *
              </label>
              <select
                value={foodCategory}
                onChange={(e) => setFoodCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
              >
                {FOOD_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
                Item Label *
              </label>
              <input
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="e.g. Fresh Vegetable Biryani"
              />
            </div>
          </div>

          {/* Dietary tags */}
          <div>
            <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1.5">
              Dietary Profile
            </label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleDietaryToggle(opt)}
                  className={`px-3 py-1 text-xs rounded-full border transition font-medium ${
                    dietaryTags.includes(opt)
                      ? "bg-brand-700 text-white border-brand-700"
                      : "bg-warmgray-50 text-warmgray-700 border-warmgray-300 hover:bg-warmgray-100"
                  }`}
                >
                  {opt.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Allergens with explicit UNKNOWN */}
          <div>
            <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Declared Allergens (Mandatory Selection) *</span>
              <span className="text-[11px] font-normal text-warmgray-500 lowercase">
                Select specific allergens or &apos;Unknown&apos;
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ALLERGEN_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleAllergenToggle(opt)}
                  className={`px-3 py-1 text-xs rounded-full border transition font-medium ${
                    allergens.includes(opt)
                      ? opt === "UNKNOWN"
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-rose-700 text-white border-rose-700"
                      : "bg-warmgray-50 text-warmgray-700 border-warmgray-300 hover:bg-warmgray-100"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
              Known Ingredients (Optional)
            </label>
            <textarea
              rows={2}
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="List primary ingredients..."
            />
          </div>
        </div>

        {/* Quantity & Unit Section */}
        <div className="space-y-4 pt-4 border-t border-warmgray-100">
          <h2 className="text-sm font-bold text-warmgray-900 uppercase tracking-wider pb-2 border-b border-warmgray-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-brand-700" />
            2. Quantity & Unit Accounting
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="listing-quantity" className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
                Quantity (Whole Integer) *
              </label>
              <input
                id="listing-quantity"
                type="number"
                min="1"
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
                Base Unit *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white font-semibold"
              >
                <option value="SERVINGS">SERVINGS (Portions)</option>
                <option value="KG">KG (Kilograms)</option>
                <option value="PACKETS">PACKETS</option>
                <option value="BOXES">BOXES</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
                Estimated Servings (Optional)
              </label>
              <input
                type="number"
                min="1"
                value={estimatedServings}
                onChange={(e) => setEstimatedServings(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>
          <p className="text-[11px] text-warmgray-500">
            Note: Quantities are stored in integer base units. Servings and Kilograms are tracked separately and never silently converted.
          </p>
        </div>

        {/* Handling & Storage */}
        <div className="space-y-4 pt-4 border-t border-warmgray-100">
          <h2 className="text-sm font-bold text-warmgray-900 uppercase tracking-wider pb-2 border-b border-warmgray-100 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-brand-700" />
            3. Storage, Packaging & Preparation
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
                Storage Method *
              </label>
              <select
                value={storageInfo}
                onChange={(e) => setStorageInfo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
              >
                {STORAGE_OPTIONS.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
                Packaging Info *
              </label>
              <select
                value={packagingInfo}
                onChange={(e) => setPackagingInfo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
              >
                {PACKAGING_OPTIONS.map((pk) => (
                  <option key={pk.value} value={pk.value}>
                    {pk.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
                Preparation Time (If Known)
              </label>
              <input
                type="datetime-local"
                value={preparationTime}
                onChange={(e) => setPreparationTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
              Handling & Vessel Return Notes
            </label>
            <textarea
              rows={2}
              value={handlingNotes}
              onChange={(e) => setHandlingNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="e.g. Please bring clean vessels or return canisters within 24 hours..."
            />
          </div>
        </div>

        {/* Location & Windows */}
        <div className="space-y-4 pt-4 border-t border-warmgray-100">
          <h2 className="text-sm font-bold text-warmgray-900 uppercase tracking-wider pb-2 border-b border-warmgray-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-700" />
            4. Pickup Windows & Coordinates
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
                Pickup Window Opens *
              </label>
              <input
                type="datetime-local"
                required
                value={pickupWindowStart}
                onChange={(e) => setPickupWindowStart(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
                Collection Deadline (Hard Expiry) *
              </label>
              <input
                type="datetime-local"
                required
                value={pickupWindowEnd}
                onChange={(e) => setPickupWindowEnd(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="pickup-address" className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
              Pickup Physical Address *
            </label>
            <input
              id="pickup-address"
              type="text"
              required
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="pickup-latitude" className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
                Latitude (Bengaluru)
              </label>
              <input
                id="pickup-latitude"
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-mono text-xs"
              />
            </div>
            <div>
              <label htmlFor="pickup-longitude" className="block text-xs font-bold text-warmgray-700 uppercase tracking-wider mb-1">
                Longitude (Bengaluru)
              </label>
              <input
                id="pickup-longitude"
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-warmgray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Safety Note & Submit */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0" />
          <span>
            <strong>Safety Notice:</strong> A collection deadline or countdown is not a guarantee that food is safe.
            The app does not infer food safety, allergens or guaranteed shelf life from photos.
          </span>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center justify-center gap-2"
        >
          {submitting ? "Publishing Batch..." : "Publish Surplus Batch & Open Matching Radar"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
