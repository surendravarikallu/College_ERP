import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from "@/examcell/hooks/use-toast";

export function BulkPhotoUpload() {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [results, setResults] = useState<{ success: number; errors: number; failedFiles: string[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const processFiles = async (files: File[]) => {
        // Only accept image files
        const validFiles = files.filter(f => f.type.startsWith('image/'));
        if (validFiles.length === 0) {
            toast({ title: 'No valid images found in folder.', variant: 'destructive' });
            return;
        }

        setIsUploading(true);
        setProgress({ current: 0, total: validFiles.length });
        setResults(null);

        let successCount = 0;
        let errorCount = 0;
        let allFailedFiles: string[] = [];

        // Chunk size of 20 to prevent payload limits
        const CHUNK_SIZE = 20;

        for (let i = 0; i < validFiles.length; i += CHUNK_SIZE) {
            const chunk = validFiles.slice(i, i + CHUNK_SIZE);
            const formData = new FormData();
            chunk.forEach(file => {
                formData.append('photos', file);
            });

            try {
                const token = (localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'));
                const req = await fetch('/api/v1/examcell/students/bulk-photos', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (!req.ok) throw new Error('Upload batch failed');
                const res = await req.json();

                successCount += (res.successCount || 0);
                errorCount += (res.errorCount || 0);
                if (res.failedFiles && Array.isArray(res.failedFiles)) {
                    allFailedFiles = allFailedFiles.concat(res.failedFiles);
                }

                setProgress(prev => ({ ...prev, current: Math.min(prev.current + chunk.length, prev.total) }));

            } catch (err: any) {
                console.error('Batch upload error', err);
                errorCount += chunk.length;
                // Continue with the next chunk even if one chunk fails
            }
        }

        setResults({ success: successCount, errors: errorCount, failedFiles: allFailedFiles });
        setIsUploading(false);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        toast({
            title: 'Bulk Upload Complete',
            description: errorCount > 0
                ? `${successCount} uploaded. ${errorCount} failed: ${allFailedFiles.join(', ')}`
                : `Successfully uploaded ${successCount} photos.`,
            variant: errorCount > 0 ? 'destructive' : 'default'
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(Array.from(e.target.files));
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(Array.from(e.dataTransfer.files));
        }
    };

    return (
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-800">Bulk Photo Upload</h3>
                <p className="text-sm text-slate-500">
                    Upload a local folder containing student photos. Ensure each photo is named by the student's Roll Number (e.g., <code className="bg-slate-100 px-1 py-0.5 rounded text-primary">23JK1A0501.jpg</code>).
                </p>
            </div>

            <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isDragging ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary/50 bg-slate-50'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {!isUploading ? (
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-200">
                            <UploadCloud className="w-8 h-8 text-primary/80" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-700">Drag & Drop an entire folder here</p>
                            <p className="text-xs text-slate-500 mt-1">or click the button below to browse</p>
                        </div>

                        {/* The webkitdirectory attribute is what allows folder selection */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            id="folder-upload"
                            {...{ webkitdirectory: "true", directory: "true", multiple: true } as any}
                        />

                        <label
                            htmlFor="folder-upload"
                            className="px-6 py-2.5 bg-primary text-slate-800 rounded-xl text-sm font-medium hover:opacity-90 transition-all cursor-pointer shadow-sm"
                        >
                            Select Folder
                        </label>
                    </div>
                ) : (
                    <div className="flex flex-col items-center py-6 space-y-4">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <div className="text-center w-full max-w-sm">
                            <p className="text-sm font-semibold text-slate-800 mb-2">
                                Uploading Photos... ({progress.current} / {progress.total})
                            </p>
                            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300 ease-out"
                                    style={{ width: `${Math.max(5, (progress.current / progress.total) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {results && !isUploading && (
                <div className={`mt-4 p-4 rounded-xl border ${results.errors > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'} flex items-start gap-4`}>
                    <div className={`mt-0.5 ${results.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {results.errors > 0 ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    <div>
                        <h4 className={`text-sm font-medium ${results.errors > 0 ? 'text-red-900' : 'text-green-900'}`}>
                            Upload Summary
                        </h4>
                        <div className="mt-1 space-y-0.5 text-xs">
                            <p className="text-slate-700">Photos Successfully Linked: <span className="font-semibold text-green-700">{results.success}</span></p>
                            {results.errors > 0 && (
                                <div>
                                    <p className="text-slate-700">Images Skipped (No matching Roll No): <span className="font-semibold text-red-600">{results.errors}</span></p>
                                    {results.failedFiles.length > 0 && (
                                        <div className="mt-1.5 p-2 bg-red-100 rounded-lg max-h-32 overflow-y-auto">
                                            {results.failedFiles.map((f, i) => (
                                                <p key={i} className="text-red-700 font-medium text-xs">â€¢ {f}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


