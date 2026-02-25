import type { Metadata } from "next";
import { BUSINESS_INFO } from "@/lib/constants";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Anis Food and Drink collects, uses, and protects your personal information when you order, contact us, or use our website.",
};

export default function PrivacyPage() {
  return (
    <div className="py-12 bg-[#F9FAFB] min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 display-font">
          Privacy Policy
        </h1>
        <p className="text-gray-600 text-sm mb-10">
          Last updated: 10 February 2026
        </p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Who we are</h2>
            <p>
              {BUSINESS_INFO.name} (&quot;we&quot;, &quot;us&quot;) operates this website and our restaurant at {BUSINESS_INFO.address}. We are committed to protecting your privacy when you use our site, place orders, or contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Information we collect</h2>
            <p className="mb-3">We may collect the following when you use our website:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Order information:</strong> name, phone number, email (optional), delivery or pickup address, order details, and any notes you provide when placing an order.</li>
              <li><strong>Contact and reservations:</strong> name, phone, email, date/time, party size, and message when you contact us or make a reservation.</li>
              <li><strong>Technical data:</strong> how you use our site (e.g. pages visited) may be collected by our hosting or analytics tools.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">How we use your information</h2>
            <p className="mb-3">We use your information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Process and fulfil your orders (including via WhatsApp and, when available, Paystack).</li>
              <li>Contact you about your order, reservation, or enquiry.</li>
              <li>Improve our website and services.</li>
              <li>Comply with applicable law.</li>
            </ul>
            <p className="mt-4">
              When you place an order, your details and order may be sent via WhatsApp to our business number. If you pay online (e.g. via Paystack), payment is processed by the payment provider according to their privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Sharing your information</h2>
            <p>
              We do not sell your personal information. We may share your data only with service providers that help us run our business (e.g. hosting, payment processing). When you use WhatsApp or Paystack, their use of your data is governed by their own privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">How long we keep your data</h2>
            <p>
              We keep order and contact information for as long as needed to fulfil orders, handle enquiries, and for legal or business purposes. You can ask us to delete or correct your data by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Your rights</h2>
            <p>
              You may ask us what data we hold about you, request correction or deletion, or withdraw consent where applicable. Contact us using the details below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Contact us</h2>
            <p>
              For privacy-related questions or requests, contact {BUSINESS_INFO.name}:
            </p>
            <ul className="list-none mt-2 space-y-1">
              <li>Phone: <a href={`tel:${BUSINESS_INFO.phone.replace(/\s/g, "")}`} className="text-primary-red hover:underline">{BUSINESS_INFO.phone}</a>, <a href={`tel:${BUSINESS_INFO.phoneSecondary.replace(/\s/g, "")}`} className="text-primary-red hover:underline">{BUSINESS_INFO.phoneSecondary}</a> (WhatsApp)</li>
              <li>Address: {BUSINESS_INFO.address}</li>
            </ul>
          </section>
        </div>

        <p className="mt-12 pt-6 border-t border-gray-200">
          <Link href="/" className="text-primary-red hover:underline font-medium">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
