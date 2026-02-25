import ReservationForm from "@/components/reservations/ReservationForm";

export const metadata = {
  title: "Book a Table",
  description:
    "Reserve a table at Anis Food and Drink. Request your preferred date, time, and party size.",
};

export default function ReservationsPage() {
  return (
    <div className="py-12 bg-[#F9FAFB] min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 display-font">
            Book a Table
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Request a reservation for your preferred date and time. We&apos;ll
            confirm by phone shortly.
          </p>
        </div>
        <ReservationForm />
      </div>
    </div>
  );
}
