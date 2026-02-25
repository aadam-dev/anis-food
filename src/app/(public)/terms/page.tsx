import type { Metadata } from "next";
import { BUSINESS_INFO } from "@/lib/constants";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using the Anis Food and Drink website and ordering food.",
};

export default function TermsPage() {
  return (
    <div className="py-12 bg-[#F9FAFB] min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 display-font">
          Terms of Service
        </h1>
        <p className="text-gray-600 text-sm mb-10">
          Last updated: 10 February 2026
        </p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Agreement</h2>
            <p>
              By using this website or placing an order with {BUSINESS_INFO.name} (&quot;we&quot;, &quot;us&quot;, &quot;Anis&quot;), you agree to these terms. If you do not agree, please do not use our site or services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Our services</h2>
            <p>
              We operate a restaurant and offer food for dine-in, pickup, and delivery. This website allows you to browse our menu, place orders (including via WhatsApp and, when available, online payment), make reservations, and contact us. We reserve the right to change our menu, prices, and availability without notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Orders</h2>
            <p className="mb-3">When you place an order:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You provide accurate contact and delivery/pickup details. We are not responsible for failed delivery or missed pickup due to incorrect information.</li>
              <li>Orders are subject to confirmation by us (e.g. by phone or WhatsApp). We may refuse or cancel an order at our discretion.</li>
              <li>Prices shown are in Ghana Cedis (GHS) and include VAT where stated. We may correct pricing errors.</li>
              <li>For delivery, we will endeavour to deliver within a reasonable time; exact times are estimates only.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Payment</h2>
            <p>
              You may pay on pickup, on delivery, or (when available) online via our payment provider (e.g. Paystack). Online payments are processed by the payment provider; their terms apply to the payment transaction. Refunds, if applicable, will be handled in line with our policy and the payment provider&apos;s rules.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Cancellations and changes</h2>
            <p>
              If you need to cancel or change an order, contact us as soon as possible by phone or WhatsApp. We will try to accommodate changes; we are not obliged to refund once preparation has started. For online payments, refund eligibility is subject to the payment provider&apos;s policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Use of the website</h2>
            <p>
              You agree to use this website only for lawful purposes. You must not misuse the site (e.g. attempt to gain unauthorised access, transmit harmful code, or use our systems to send spam). We may suspend or block access if we believe you have breached these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, we are not liable for any indirect, incidental, or consequential loss arising from your use of the site or our services. Our total liability for any claim relating to an order or the site shall not exceed the amount you paid for the relevant order. Nothing in these terms excludes liability we cannot exclude by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Privacy</h2>
            <p>
              Your use of the site and our services is also governed by our{" "}
              <Link href="/privacy" className="text-primary-red hover:underline">
                Privacy Policy
              </Link>
              , which explains how we collect and use your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Changes to these terms</h2>
            <p>
              We may update these terms from time to time. The &quot;Last updated&quot; date at the top of this page will change when we do. Continued use of the site or our services after changes means you accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Contact</h2>
            <p>
              For questions about these terms or our services, contact us:
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
