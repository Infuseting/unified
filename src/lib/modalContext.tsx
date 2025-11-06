"use client";
import React, { createContext, useContext, useState } from "react";
import type { App } from "@/app/data/app-config";

type ModalState = {
  open: boolean;
  app: App | null;
};

type ModalContextType = {
  state: ModalState;
  openModal: (app: App) => void;
  closeModal: () => void;
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ModalState>({ open: false, app: null });

  const openModal = (app: App) => setState({ open: true, app });
  const closeModal = () => setState({ open: false, app: null });

  return (
    <ModalContext.Provider value={{ state, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}

export default ModalContext;
