import { MapPin, Phone, Clock } from "lucide-react";
import { BUSINESS_INFO } from "@/lib/constants";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
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
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3970.2198177486393!2d-0.1284039!3d5.681335700000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xfdf8338fc75cde3%3A0x184c4966637306d5!2sAnis%20Food%20and%20Drink!5e0!3m2!1sen!2sus!4v1768162065055!5m2!1sen!2sus"
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
                <div>
                  <h3 className="font-semibold text-lg mb-2">Phone</h3>
                  <a
                    href={`tel:${BUSINESS_INFO.phone}`}
                    className="text-[#DC2626] hover:underline"
                  >
                    {BUSINESS_INFO.phone}
                  </a>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start space-x-4">
                <Clock className="w-6 h-6 text-[#DC2626] mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Opening Hours</h3>
                  <p className="text-gray-600">
                    <span className="block">Mon-Fri: {BUSINESS_INFO.hours.weekdays}</span>
                    <span className="block">Sat-Sun: {BUSINESS_INFO.hours.weekends}</span>
                  </p>
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

