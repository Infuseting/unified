import React from "react";
import { FaThumbtack } from "react-icons/fa";
import { IconType } from "react-icons/lib";

interface AppCardProps {
  name: string;
  icon: string | React.ReactNode | IconType;
  url: string;
  onClick?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  pinLabel?: string;
  unpinLabel?: string;
}

export function AppCard({ name, icon, url, onClick, isPinned, onTogglePin, pinLabel, unpinLabel }: AppCardProps) {
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
      {typeof onTogglePin === "function" && (
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
        {typeof icon === "string" ? <img src={icon} alt={`${name} icon`} className="w-12 h-12 object-contain" /> : React.isValidElement(icon) ? icon : React.createElement(icon as IconType)}

      </div>
      <div className="text-white/90 text-center group-hover:text-white transition-colors">
        {name}
      </div>
    </a>
  );
}
