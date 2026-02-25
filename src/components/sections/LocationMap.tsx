"use client";

import { MapPin, Phone, Clock } from "lucide-react";
import { BUSINESS_INFO } from "@/lib/constants";
import { getMapEmbedUrl } from "@/lib/map";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LiveOpenStatus from "@/components/ui/LiveOpenStatus";
import Link from "next/link";

export default function LocationMap() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 display-font">
            Visit Us
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Come and experience our delicious food in person or order for delivery
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Map */}
          <div className="rounded-xl overflow-hidden shadow-lg">
            <iframe
              src={getMapEmbedUrl(BUSINESS_INFO.location)}
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: "400px" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Anis Food and Drink Location"
            />
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-start space-x-4">
                <MapPin className="w-6 h-6 text-[#DC2626] mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Address</h3>
                  <p className="text-gray-600">{BUSINESS_INFO.address}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start space-x-4">
                <Phone className="w-6 h-6 text-[#DC2626] mt-1 flex-shrink-0" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg mb-2">Phone</h3>
                  <a
                    href={`tel:${BUSINESS_INFO.phone.replace(/\s/g, "")}`}
                    className="block text-[#DC2626] hover:underline"
                  >
                    {BUSINESS_INFO.phone}
                  </a>
                  <a
                    href={`tel:${BUSINESS_INFO.phoneSecondary.replace(/\s/g, "")}`}
                    className="block text-[#DC2626] hover:underline"
                  >
                    {BUSINESS_INFO.phoneSecondary} <span className="text-gray-600 text-sm">(WhatsApp)</span>
                  </a>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start space-x-4">
                <Clock className="w-6 h-6 text-[#DC2626] mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Opening Hours</h3>
                  <LiveOpenStatus variant="card" className="text-gray-600" />
                </div>
              </div>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/contact" className="flex-1">
                <Button variant="primary" size="lg" fullWidth>
                  Get Directions
                </Button>
              </Link>
              <Link href="/order" className="flex-1">
                <Button variant="outline" size="lg" fullWidth>
                  Order Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

