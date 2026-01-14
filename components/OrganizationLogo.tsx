'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { validateLogoFile } from '../lib/storage';
import { useUnifiedAuth } from '../contexts/UnifiedAuthContext';

interface OrganizationLogoProps {
  organizationName: string;
  onLogoChange?: (logoURL: string | null) => void;
  logoURL?: string; // Direct logo URL (read-only mode)
  pendingLogoURL?: string; // Pending logo URL awaiting review
  logoStatus?: 'pending_review' | 'approved' | 'rejected';
  readOnly?: boolean; // Whether to disable editing
}

export default function OrganizationLogo({
  organizationName,
  onLogoChange,
  logoURL: propLogoURL,
  pendingLogoURL: propPendingLogoURL,
  logoStatus: propLogoStatus,
  readOnly = false
}: OrganizationLogoProps) {
  const { member } = useUnifiedAuth();
  // Show pending logo if it exists (user can see their own pending upload), otherwise approved logo
  const [logoURL, setLogoURL] = useState<string | null>(propPendingLogoURL || propLogoURL || null);
  const [isPending, setIsPending] = useState(propLogoStatus === 'pending_review');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(!propLogoURL);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Use prop logo URL if provided (read-only mode)
  useEffect(() => {
    // Prioritize pending logo for non-read-only (user's own profile)
    const urlToUse = !readOnly && propPendingLogoURL ? propPendingLogoURL : propLogoURL;

    if (urlToUse) {
      setLogoURL(urlToUse);
      setImageError(false);
      setIsLoading(false);
      setIsPending(propLogoStatus === 'pending_review');
      return;
    }

    // For non-read-only mode without prop URL, start with no logo
    if (!readOnly) {
      setIsLoading(false);
    }
  }, [propLogoURL, propPendingLogoURL, propLogoStatus, readOnly]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !member?.organizationId) return;

    // Clear error only when user attempts a new upload
    setError(null);
    setIsUploading(true);

    try {
      // Validate file using the storage utility
      validateLogoFile(file);

      // Get auth token for API request
      const { auth } = await import('../lib/firebase');
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      // Upload via API route using FormData (Admin SDK on server)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('identifier', member.organizationId);
      formData.append('organizationName', organizationName);

      const response = await fetch('/api/upload-logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update local state
      setLogoURL(result.downloadURL);
      setImageError(false);
      setIsPending(true); // New uploads are pending review

      // Notify parent component
      onLogoChange?.(result.downloadURL);
    } catch (error) {
      // Error persists until user tries again or navigates away
      setError(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    if (readOnly) return;
    fileInputRef.current?.click();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="relative w-20 h-20 group">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Show uploaded logo if exists and not errored, otherwise show placeholder */}
      {logoURL && !imageError ? (
        <div className={`relative w-full h-full group ${readOnly ? '' : 'cursor-pointer'}`} onClick={handleUploadClick}>
          <Image
            src={logoURL}
            alt={`${organizationName} logo`}
            fill
            className="object-contain"
            onError={() => setImageError(true)}
          />
          {/* Pending review indicator */}
          {isPending && !readOnly && (
            <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[8px] px-1 py-0.5 rounded font-medium z-10">
              Pending
            </div>
          )}
          {!readOnly && (
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium">Change</span>
            </div>
          )}
        </div>
      ) : (
        <div 
          className={`w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center ${
            readOnly ? '' : 'hover:border-gray-400 transition-colors cursor-pointer'
          }`}
          onClick={readOnly ? undefined : handleUploadClick}
        >
          {isLoading ? (
            <div className="animate-pulse text-gray-500 text-xs">Loading...</div>
          ) : isUploading ? (
            <div className="animate-pulse text-gray-500 text-xs">Uploading...</div>
          ) : (
            <div className="text-center">
              {!readOnly ? (
                <>
                  <svg className="w-8 h-8 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <div className="text-gray-400 text-xs">Upload Logo</div>
                </>
              ) : (
                <div className="text-gray-400 text-xs font-medium">{getInitials(organizationName)}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Message - positioned absolutely to not affect layout */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 text-xs text-red-600 text-center bg-red-50 border border-red-200 rounded px-2 py-1 z-10">{error}</div>
      )}
    </div>
  );
}