"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, MapPin, Clock, MessageCircle } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { BUSINESS_INFO } from "@/lib/constants";
import { getMapEmbedUrl } from "@/lib/map";
import { getWhatsAppContactUrl } from "@/lib/utils";
import LiveOpenStatus from "@/components/ui/LiveOpenStatus";

const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(6, "Phone is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = (data: ContactFormData) => {
    setResult(null);
    const url = getWhatsAppContactUrl(BUSINESS_INFO.phoneSecondary, data);
    window.open(url, "_blank", "noopener,noreferrer");
    setResult({
      success: true,
      message:
        "Opening WhatsApp with your message. You can send it from there.",
    });
    reset();
  };

  return (
    <div className="py-12 bg-[#F9FAFB] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 display-font">
            Get in Touch
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Have a question or want to place an order? We&apos;d love to hear from you!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input
                label="Full Name"
                {...register("name", { required: "Name is required" })}
                error={errors.name?.message}
              />

              <Input
                label="Email"
                type="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
                error={errors.email?.message}
              />

              <Input
                label="Phone Number"
                type="tel"
                {...register("phone", { required: "Phone number is required" })}
                error={errors.phone?.message}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register("message", { required: "Message is required" })}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-colors"
                  placeholder="Tell us how we can help..."
                />
                {errors.message && (
                  <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
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
                <MessageCircle className="w-5 h-5 mr-2 inline group-hover:translate-x-1 transition-transform" />
                {isSubmitting ? "Submitting…" : "Submit & Open WhatsApp"}
              </Button>
            </form>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-start space-x-4">
                <Phone className="w-6 h-6 text-[#DC2626] mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Phone</h3>
                  <a
                    href={`tel:${BUSINESS_INFO.phone.replace(/\s/g, "")}`}
                    className="text-[#DC2626] hover:underline text-lg block"
                  >
                    {BUSINESS_INFO.phone}
                  </a>
                  <a
                    href={`tel:${BUSINESS_INFO.phoneSecondary.replace(/\s/g, "")}`}
                    className="text-[#DC2626] hover:underline text-lg block mt-1"
                  >
                    {BUSINESS_INFO.phoneSecondary} <span className="text-gray-600 font-normal text-base">(WhatsApp)</span>
                  </a>
                  <p className="text-sm text-gray-600 mt-1">
                    Call or message for orders and inquiries
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start space-x-4">
                <MapPin className="w-6 h-6 text-[#DC2626] mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Address</h3>
                  <p className="text-gray-700">{BUSINESS_INFO.address}</p>
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Anis+Food+and+Drink+Botwe+Accra"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#DC2626] hover:underline text-sm mt-2 inline-block"
                  >
                    Get Directions →
                  </a>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start space-x-4">
                <Clock className="w-6 h-6 text-[#DC2626] mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Opening Hours</h3>
                  <LiveOpenStatus variant="card" className="text-gray-700" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-r from-[#DC2626] to-[#F97316] text-white">
              <h3 className="font-semibold text-lg mb-2">Follow Us</h3>
              <p className="mb-4 text-white/90">
                Stay updated with our latest dishes, special offers, and events
              </p>
              <div className="flex flex-wrap gap-3">
                {BUSINESS_INFO.socialMedia.instagram && (
                  <a
                    href={BUSINESS_INFO.socialMedia.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/20 hover:bg-white/30 rounded-lg px-4 py-3 transition-colors"
                    aria-label="Instagram"
                  >
                    <span className="text-sm font-semibold">Instagram</span>
                  </a>
                )}
                {BUSINESS_INFO.socialMedia.facebook && (
                  <a
                    href={BUSINESS_INFO.socialMedia.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/20 hover:bg-white/30 rounded-lg px-4 py-3 transition-colors"
                    aria-label="Facebook"
                  >
                    <span className="text-sm font-semibold">Facebook</span>
                  </a>
                )}
                {BUSINESS_INFO.socialMedia.tiktok && (
                  <a
                    href={BUSINESS_INFO.socialMedia.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/20 hover:bg-white/30 rounded-lg px-4 py-3 transition-colors"
                    aria-label="TikTok"
                  >
                    <span className="text-sm font-semibold">TikTok</span>
                  </a>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Map */}
        <div className="mt-12 rounded-xl overflow-hidden shadow-lg">
          <iframe
            src={getMapEmbedUrl(BUSINESS_INFO.location)}
            width="100%"
            height="450"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Anis Food and Drink Location"
          />
        </div>
      </div>
    </div>
  );
}

