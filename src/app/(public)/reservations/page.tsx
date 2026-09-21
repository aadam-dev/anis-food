import PageHeader from "@/components/public/PageHeader";
import ReservationForm from "@/components/reservations/ReservationForm";

export const metadata = {
  title: "Book a Table",
  description:
    "Reserve a table at Anis Food and Drink. Request your preferred date, time, and party size.",
};

export default function ReservationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Reservations"
        title="Book a"
        highlight="table"
        subtitle="Request your preferred date and time — we'll confirm by phone shortly."
        image="/images/gallery/interior.webp"
      />
      <section className="bg-warm py-16 md:py-20 min-h-screen">
        <div className="mx-auto max-w-2xl px-6">
          <div className="rounded-2xl border border-black/5 bg-white p-6 sm:p-8 shadow-sm">
            <ReservationForm />
          </div>
        </div>
      </section>
    </>
  );
}
