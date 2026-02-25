"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import ReservationModal from "@/components/sections/ReservationModal";

interface ReservationModalContextValue {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const ReservationModalContext = createContext<ReservationModalContextValue | null>(null);

export function ReservationModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  return (
    <ReservationModalContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
      <ReservationModal isOpen={isOpen} onClose={closeModal} />
    </ReservationModalContext.Provider>
  );
}

export function useReservationModal() {
  const ctx = useContext(ReservationModalContext);
  if (!ctx) {
    throw new Error("useReservationModal must be used within ReservationModalProvider");
  }
  return ctx;
}
