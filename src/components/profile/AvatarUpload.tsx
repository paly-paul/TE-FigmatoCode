"use client";

import { useRef } from "react";
import { PersonIcon, SmallUploadIcon, TrashIcon } from "@/components/icons";

interface AvatarUploadProps {
  photoUrl: string | null;
  onUpload: (url: string) => void;
  onDelete: () => void;
}

export function AvatarUpload({ photoUrl, onUpload, onDelete }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const allowed = ["image/jpeg", "image/png", "image/gif"];
    if (!allowed.includes(file.type)) {
      alert("Only JPG, PNG or GIF files are supported.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    onUpload(url);
  }

  return (
    <div className="flex items-center gap-4 bg-blue-50 rounded-xl p-4">
      {/* Thumbnail / placeholder */}
      <div className="w-16 h-16 rounded-lg border border-blue-100 bg-white flex items-center justify-center overflow-hidden shrink-0">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <PersonIcon />
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <SmallUploadIcon />
            Upload
          </button>
          {photoUrl && (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 bg-white hover:bg-red-50 transition-colors text-red-500"
              aria-label="Remove photo"
            >
              <TrashIcon />
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">JPG, PNG, or GIF up to 2 MB</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files)}
      />
    </div>
  );
}
