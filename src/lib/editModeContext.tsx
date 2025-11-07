"use client";
import React, { createContext, useContext, useState } from "react";

type EditModeContextType = {
  editMode: boolean;
  toggleEditMode: () => void;
  setEditMode: (v: boolean) => void;
};

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

export function EditModeProvider({ children }: { children: React.ReactNode }) {
  const [editMode, setEditMode] = useState(false);
  const toggleEditMode = () => setEditMode((s) => !s);
  return (
    <EditModeContext.Provider value={{ editMode, toggleEditMode, setEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const ctx = useContext(EditModeContext);
  if (!ctx) throw new Error("useEditMode must be used within EditModeProvider");
  return ctx;
}
