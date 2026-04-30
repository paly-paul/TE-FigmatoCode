"use client";

import { useRef, useState } from "react";
import {
  UploadBoxIcon,
  SmallUploadIcon,
  TrashIcon,
  CheckCircleSolidIcon,
} from "@/components/icons";
import { RotatingLoadingQuote } from "@/components/ui/RotatingLoadingQuote";

interface UploadedFile {
  name: string;
  uploadDate: string;
}

interface ResumeUploadAreaProps {
  uploadedFile: UploadedFile | null;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => void;
}

export function ResumeUploadArea({
  uploadedFile,
  onUpload,
  onDelete,
}: ResumeUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadFileName, setUploadingFileName] = useState("");
  const MIN_LOADER_MS = 5200;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (isUploading) return;
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

    // Start upload animation and keep it visible long enough to read quotes.
    setIsUploading(true);
    setUploadingFileName(file.name);
    const startedAt = Date.now();
    try {
      await onUpload(file);
    } catch {
      alert("We couldn't parse that resume. Please try again.");
    } finally {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
      if (remaining > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remaining));
      }
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    void handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`relative rounded-xl border-2 border-dashed transition-colors min-h-[280px] flex items-center justify-center ${isDragging
        ? "border-primary-400 bg-primary-50"
        : "border-gray-300 bg-gray-50"
        }`}
    >
      {isUploading ? (
        <div className="flex flex-col items-center gap-4 py-10 px-6">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <style jsx>{`
        @keyframes shape1-morph {
          0%, 100% {
            transform: translate(0px, -14px) rotate(45deg);
            border-radius: 2px;
          }
          25% {
            transform: translate(14px, 0px) rotate(90deg);
            border-radius: 50%;
          }
          50% {
            transform: translate(0px, 14px) rotate(135deg);
            border-radius: 2px;
          }
          75% {
            transform: translate(-14px, 0px) rotate(180deg);
            border-radius: 50%;
          }
        }

        @keyframes shape2-morph {
          0%, 100% {
            transform: translate(-14px, 0px) rotate(45deg);
            border-radius: 2px;
          }
          25% {
            transform: translate(0px, -14px) rotate(90deg);
            border-radius: 50%;
          }
          50% {
            transform: translate(14px, 0px) rotate(135deg);
            border-radius: 2px;
          }
          75% {
            transform: translate(0px, 14px) rotate(180deg);
            border-radius: 50%;
          }
        }

        @keyframes shape3-morph {
          0%, 100% {
            transform: translate(0px, 14px) rotate(45deg);
            border-radius: 2px;
          }
          25% {
            transform: translate(-14px, 0px) rotate(90deg);
            border-radius: 50%;
          }
          50% {
            transform: translate(0px, -14px) rotate(135deg);
            border-radius: 2px;
          }
          75% {
            transform: translate(14px, 0px) rotate(180deg);
            border-radius: 50%;
          }
        }

        @keyframes shape4-morph {
          0%, 100% {
            transform: translate(14px, 0px) rotate(45deg);
            border-radius: 2px;
          }
          25% {
            transform: translate(0px, 14px) rotate(90deg);
            border-radius: 50%;
          }
          50% {
            transform: translate(-14px, 0px) rotate(135deg);
            border-radius: 2px;
          }
          75% {
            transform: translate(0px, -14px) rotate(180deg);
            border-radius: 50%;
          }
        }

        .loader-shape {
          position: absolute;
          width: 12px;
          height: 12px;
          background-color: #2563eb;
          will-change: transform, border-radius;
        }

        .shape-1 {
          animation: shape1-morph 2.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        }
        .shape-2 {
          animation: shape2-morph 2.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        }
        .shape-3 {
          animation: shape3-morph 2.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        }
        .shape-4 {
          animation: shape4-morph 2.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        }
      `}</style>

            <div className="loader-shape shape-1" />
            <div className="loader-shape shape-2" />
            <div className="loader-shape shape-3" />
            <div className="loader-shape shape-4" />
          </div>

          <p className="text-sm font-medium text-gray-700">
            Uploading {uploadFileName}...
          </p>
          <RotatingLoadingQuote className="max-w-md" />
        </div>
      ) : uploadedFile ? (
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
            onClick={() => {
              if (inputRef.current) {
                inputRef.current.value = "";
                inputRef.current.click();
              }
            }}
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
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
