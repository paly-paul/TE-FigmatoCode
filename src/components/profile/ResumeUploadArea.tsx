"use client";

import { useRef, useState } from "react";
import {
  UploadBoxIcon,
  SmallUploadIcon,
  TrashIcon,
  CheckCircleSolidIcon,
} from "@/components/icons";

interface UploadedFile {
  name: string;
  uploadDate: string;
}

interface ResumeUploadAreaProps {
  uploadedFile: UploadedFile | null;
  onUpload: (file: File) => void;
  onDelete: () => void;
}

export function ResumeUploadArea({
  uploadedFile,
  onUpload,
  onDelete,
}: ResumeUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.type)) {
      alert("Only PDF or DOCX files are supported.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be under 5 MB.");
      return;
    }
    onUpload(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`relative rounded-xl border-2 border-dashed transition-colors min-h-[280px] flex items-center justify-center ${
        isDragging
          ? "border-primary-400 bg-primary-50"
          : "border-gray-300 bg-gray-50"
      }`}
    >
      {uploadedFile ? (
        /*  Uploaded state  */
        <div className="flex flex-col items-center gap-3 py-10">
          <CheckCircleSolidIcon size={48} />
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900">
              {uploadedFile.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Uploaded on {uploadedFile.uploadDate}
            </p>
          </div>
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1.5 mt-1 border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <TrashIcon />
            Delete
          </button>
        </div>
      ) : (
        /*  Empty / drop state  */
        <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
          <UploadBoxIcon />
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Click upload or drag file to this area to upload
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supports PDF, Docx files upto 5 MB
            </p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-5 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <SmallUploadIcon />
            Upload
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
