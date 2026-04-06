"use client";

import { useState, useEffect, useRef } from "react";

interface CommentModalProps {
    date: string;
    initialComment?: string;
    onClose: () => void;
    onSubmit: (comment: string) => void;
    triggerElement?: HTMLElement | null;
}

export default function CommentModal({
    date,
    initialComment = "",
    onClose,
    onSubmit,
    triggerElement,
}: CommentModalProps) {
    const [comment, setComment] = useState(initialComment);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (triggerElement && popoverRef.current) {
            const rect = triggerElement.getBoundingClientRect();
            const popoverHeight = 280; // Approximate height of the popover
            const popoverWidth = 280;

            // Position below the trigger element using viewport coordinates
            let top = rect.bottom + 8;
            let left = rect.left - popoverWidth / 2 + rect.width / 2;

            // Ensure it stays within viewport
            if (left < 10) left = 10;
            if (left + popoverWidth > window.innerWidth - 10) {
                left = window.innerWidth - popoverWidth - 10;
            }

            // Check if it would go below viewport, if so, position above
            if (top + popoverHeight > window.innerHeight - 10) {
                top = rect.top - popoverHeight - 8;
            }

            setPosition({ top, left });
        }
    }, [triggerElement]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    const handleSubmit = () => {
        onSubmit(comment);
        onClose();
    };

    return (
        <>
            {/* Invisible backdrop - no visual overlay */}
            <div className="fixed inset-0 z-40" onClick={onClose} />

            {/* Popover - using fixed positioning */}
            <div
                ref={popoverRef}
                style={{
                    position: "fixed",
                    top: `${position.top}px`,
                    left: `${position.left}px`,
                }}
                className="z-50 w-[280px] rounded-lg border border-slate-200 bg-white shadow-lg"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <span className="text-sm font-semibold text-slate-900">Comment</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-6 w-6 items-center justify-center text-slate-400 hover:text-slate-600 transition"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            className="stroke-current"
                        >
                            <path
                                d="M4 4L12 12M4 12L12 4"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                    <textarea
                        placeholder="Enter text here..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        maxLength={100}
                        autoFocus
                        className="w-full h-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    />

                    <div className="flex items-center justify-end">
                        <span className="text-xs text-slate-400">{comment.length} / 100</span>
                    </div>

                    <div className="flex items-center justify-end">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="rounded-lg bg-[#033CE5] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Submit
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}