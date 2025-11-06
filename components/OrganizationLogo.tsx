'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { uploadOrganizationLogo, validateLogoFile, getOrganizationLogoURL } from '../lib/storage';

interface OrganizationLogoProps {
  organizationName: string;
  onLogoChange?: (logoURL: string | null) => void;
  logoURL?: string; // Direct logo URL (read-only mode)
  readOnly?: boolean; // Whether to disable editing
}

export default function OrganizationLogo({ 
  organizationName, 
  onLogoChange,
  logoURL: propLogoURL,
  readOnly = false
}: OrganizationLogoProps) {
  const [logoURL, setLogoURL] = useState<string | null>(propLogoURL || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(!propLogoURL);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use prop logo URL if provided (read-only mode)
  useEffect(() => {
    if (propLogoURL) {
      setLogoURL(propLogoURL);
      setIsLoading(false);
      return;
    }
  }, [propLogoURL]);

  // Fetch existing logo on component mount (only if not read-only and no prop logo)
  useEffect(() => {
    if (readOnly || propLogoURL) return;
    
    const fetchLogo = async () => {
      if (!organizationName) return;
      
      try {
        setIsLoading(true);
        const existingLogoURL = await getOrganizationLogoURL(organizationName);
        if (existingLogoURL) {
          setLogoURL(existingLogoURL);
          onLogoChange?.(existingLogoURL);
        }
      } catch (error) {
        console.log('No existing logo found for', organizationName);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogo();
  }, [organizationName, onLogoChange, readOnly, propLogoURL]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      validateLogoFile(file);
      const result = await uploadOrganizationLogo(file, organizationName);
      setLogoURL(result.downloadURL);
      onLogoChange?.(result.downloadURL);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
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

      {/* Show uploaded logo if exists, otherwise show placeholder */}
      {logoURL ? (
        <div className={`relative w-full h-full group ${readOnly ? '' : 'cursor-pointer'}`} onClick={handleUploadClick}>
          <Image
            src={logoURL}
            alt={`${organizationName} logo`}
            fill
            className="object-contain"
          />
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
              <div className="text-gray-400 text-xs font-medium">{getInitials(organizationName)}</div>
              {!readOnly && <div className="text-gray-400 text-xs mt-1">Upload</div>}
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