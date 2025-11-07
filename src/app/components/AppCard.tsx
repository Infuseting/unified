"use client";
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { FaThumbtack, FaEllipsisV, FaEdit, FaTrash } from "react-icons/fa";
import { IconType } from "react-icons/lib";
import { useEditMode } from "@/lib/editModeContext";

interface AppCardProps {
  name: string;
  icon: string | React.ReactNode | IconType;
  url: string;
  onClick?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  pinLabel?: string;
  unpinLabel?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function AppCard({ name, icon, url, onClick, isPinned, onTogglePin, pinLabel, unpinLabel, onEdit, onDelete }: AppCardProps) {
  const { editMode } = useEditMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  // position the floating menu based on button rect
  const repositionMenu = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    // place menu just below button, right-aligned to button
    setMenuStyle({ position: "absolute", top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX, zIndex: 9999 });
  };

  // close when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const onDocDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (menuRef.current && (menuRef.current === target || menuRef.current.contains(target))) return;
      if (buttonRef.current && (buttonRef.current === target || buttonRef.current.contains(target))) return;
      setMenuOpen(false);
    };
    const onScrollOrResize = () => repositionMenu();
    document.addEventListener("mousedown", onDocDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    repositionMenu();
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [menuOpen]);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-black/60 hover:border-white/20 transition-all duration-300 flex flex-col items-center justify-center gap-4 aspect-square"
    >
      {editMode ? (
        <div className="absolute top-3 right-3 z-10">
          <button
            ref={buttonRef}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setMenuOpen((s) => !s);
            }}
            title="Options"
            className="p-1 rounded text-white/80 hover:text-white bg-black/20"
            aria-label="options"
          >
            <FaEllipsisV className="w-4 h-4" />
          </button>
          {menuOpen && typeof document !== "undefined" && createPortal(
            <div ref={menuRef} style={menuStyle} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded shadow py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setMenuOpen(false);
                  onEdit && onEdit();
                }}
                className="flex items-center gap-2 px-3 py-2 text-white hover:bg-white/5 w-full text-left"
              >
                <FaEdit /> <span>Edit</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setMenuOpen(false);
                  onDelete && onDelete();
                }}
                className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-white/5 w-full text-left"
              >
                <FaTrash /> <span>Delete</span>
              </button>
            </div>,
            document.body,
          )}
        </div>
      ) : typeof onTogglePin === "function" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onTogglePin();
          }}
          title={isPinned ? unpinLabel ?? "Unpin" : pinLabel ?? "Pin"}
          aria-label={isPinned ? unpinLabel ?? "Unpin" : pinLabel ?? "Pin"}
          className={`absolute top-3 right-3 z-10 p-1 rounded text-white/80 hover:text-white transition-colors ${isPinned ? "bg-yellow-600/20" : "bg-black/20"}`}
        >
          <FaThumbtack className={`w-4 h-4 ${isPinned ? "rotate-45" : ""}`} />
        </button>
      )}
      <div className="text-5xl group-hover:scale-110 transition-transform duration-300">
        {typeof icon === "string" ? (
          <img src={icon} alt={`${name} icon`} className="w-12 h-12 object-contain" />
        ) : React.isValidElement(icon) ? (
          icon
        ) : typeof icon === "function" ? (
          // icon is a react-icon component
          React.createElement(icon as IconType)
        ) : (
          // fallback placeholder if icon is missing/invalid
          <div className="w-12 h-12 rounded bg-white/10 flex items-center justify-center text-white/70">?</div>
        )}
      </div>
      <div className="text-white/90 text-center group-hover:text-white transition-colors">
        {name}
      </div>
    </a>
  );
}
