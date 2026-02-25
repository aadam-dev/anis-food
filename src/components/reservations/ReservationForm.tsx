"use client";

import { useForm } from "react-hook-form";
import { getWhatsAppReservationUrl } from "@/lib/utils";
import { BUSINESS_INFO } from "@/lib/constants";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Calendar } from "lucide-react";
import { useState } from "react";

interface ReservationFormData {
  date: string;
  time: string;
  partySize: number;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

interface ReservationFormProps {
  onSuccess?: () => void;
  hideTitle?: boolean;
}

export default function ReservationForm({ onSuccess, hideTitle }: ReservationFormProps) {
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReservationFormData>({
    defaultValues: {
      email: "",
      notes: "",
    },
  });

  function onSubmit(data: ReservationFormData) {
    setResult(null);
    const url = getWhatsAppReservationUrl(BUSINESS_INFO.phoneSecondary, data);
    window.open(url, "_blank", "noopener,noreferrer");
    setResult({
      success: true,
      message: "Opening WhatsApp with your reservation details. Send the message to confirm.",
    });
    onSuccess?.();
  }

  return (
    <div>
      {!hideTitle && (
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Request a reservation</h2>
      )}
      {result && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            result.success
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
          role="status"
        >
          {result.message}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register("date", { required: "Date is required" })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-colors"
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              {...register("time", { required: "Time is required" })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-colors"
            />
            {errors.time && (
              <p className="mt-1 text-sm text-red-600">{errors.time.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Party size <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            max={20}
            {...register("partySize", {
              required: "Party size is required",
              min: { value: 1, message: "At least 1 guest" },
              max: { value: 20, message: "Maximum 20 guests" },
              valueAsNumber: true,
            })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-colors"
          />
          {errors.partySize && (
            <p className="mt-1 text-sm text-red-600">{errors.partySize.message}</p>
          )}
        </div>

        <Input
          label="Full Name"
          {...register("name", { required: "Name is required", minLength: { value: 2, message: "Name is required" } })}
          error={errors.name?.message}
        />

        <Input
          label="Phone Number"
          type="tel"
          {...register("phone", { required: "Phone is required", minLength: { value: 6, message: "Enter a valid phone number" } })}
          error={errors.phone?.message}
        />

        <Input
          label="Email (Optional)"
          type="email"
          {...register("email")}
          error={errors.email?.message}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Special requests (Optional)
          </label>
          <textarea
            {...register("notes", { maxLength: 500 })}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-colors"
            placeholder="Dietary needs, high chair, etc."
          />
          {errors.notes && (
            <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={isSubmitting}
          className="group"
        >
          <Calendar className="w-5 h-5 mr-2 inline group-hover:translate-x-1 transition-transform" />
          {isSubmitting ? "Submitting…" : "Request reservation"}
        </Button>
      </form>
    </div>
  );
}
