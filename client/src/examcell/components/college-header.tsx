import React from "react";

/**
 * CollegeHeader — renders the official KITS AKSHAR letterhead banner
 * directly from the header image file in /public.
 * This ensures pixel-perfect match with the official letterhead.
 */
export function CollegeHeader({ className = "" }: { className?: string }) {
    return (
        <div className={`w-full bg-white flex justify-center items-center py-2 ${className}`}>
            <img
                src="/Screenshot 2025-07-25 113411_1753423944040.webp"
                alt="KITS Akshar Institute of Technology — Official Header"
                className="w-full max-w-5xl h-auto object-contain"
                style={{ maxHeight: 150 }}
            />
        </div>
    );
}
