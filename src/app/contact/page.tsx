"use client";

import { useForm } from "react-hook-form";
import { Phone, MapPin, Clock, Mail, Send } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { BUSINESS_INFO } from "@/lib/constants";

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export default function ContactPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>();

  const onSubmit = (data: ContactFormData) => {
    // In production, this would send to an API
    console.log("Contact form submitted:", data);
    alert("Thank you for your message! We'll get back to you soon.");
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
            Have a question or want to place an order? We'd love to hear from you!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
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

              <Button type="submit" variant="primary" size="lg" fullWidth className="group">
                <Send className="w-5 h-5 mr-2 inline group-hover:translate-x-1 transition-transform" />
                Send Message
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
                    href={`tel:${BUSINESS_INFO.phone}`}
                    className="text-[#DC2626] hover:underline text-lg"
                  >
                    {BUSINESS_INFO.phone}
                  </a>
                  <p className="text-sm text-gray-600 mt-1">
                    Call us for orders or inquiries
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
                  <div className="text-gray-700 space-y-1">
                    <p>Monday - Friday: {BUSINESS_INFO.hours.weekdays}</p>
                    <p>Saturday - Sunday: {BUSINESS_INFO.hours.weekends}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-r from-[#DC2626] to-[#F97316] text-white">
              <h3 className="font-semibold text-lg mb-2">Follow Us</h3>
              <p className="mb-4 text-white/90">
                Stay updated with our latest dishes, special offers, and events
              </p>
              <div className="flex space-x-4">
                {BUSINESS_INFO.socialMedia.instagram && (
                  <a
                    href={BUSINESS_INFO.socialMedia.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/20 hover:bg-white/30 rounded-lg p-3 transition-colors"
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
                    className="bg-white/20 hover:bg-white/30 rounded-lg p-3 transition-colors"
                    aria-label="Facebook"
                  >
                    <span className="text-sm font-semibold">Facebook</span>
                  </a>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Map */}
        <div className="mt-12 rounded-xl overflow-hidden shadow-lg">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3970.2198177486393!2d-0.1284039!3d5.681335700000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xfdf8338fc75cde3%3A0x184c4966637306d5!2sAnis%20Food%20and%20Drink!5e0!3m2!1sen!2sus!4v1768162065055!5m2!1sen!2sus"
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

