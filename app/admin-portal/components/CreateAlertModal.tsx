'use client';

import { useState } from 'react';
import Modal from '../../../components/Modal';
import Button from '../../../components/Button';
import { searchMembersByOrganizationName, UnifiedMember } from '../../../lib/unified-member';

interface CreateAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAlert: (alertData: any) => Promise<void>;
  memberApplications: UnifiedMember[];
}

// Simple markdown renderer for alert content
function renderMarkdown(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n/g, '<br>');
}

export default function CreateAlertModal({ isOpen, onClose, onCreateAlert, memberApplications }: CreateAlertModalProps) {
  const [alertForm, setAlertForm] = useState({
    title: '',
    message: '',
    translations: {
      en: { title: '', message: '', actionText: '' },
      fr: { title: '', message: '', actionText: '' },
      de: { title: '', message: '', actionText: '' },
      es: { title: '', message: '', actionText: '' },
      it: { title: '', message: '', actionText: '' },
      nl: { title: '', message: '', actionText: '' }
    },
    type: 'info' as 'info' | 'warning' | 'error' | 'success',
    targetAudience: 'members' as 'all' | 'members' | 'admins' | 'specific' | 'member_type' | 'specific_members',
    organizationType: '' as '' | 'MGA' | 'carrier' | 'provider',
    organizationSearch: '',
    selectedOrganizations: [] as string[],
    actionRequired: false,
    actionUrl: '',
    actionText: '',
    expiresAt: '',
    sendEmail: false
  });

  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'fr' | 'de' | 'es' | 'it' | 'nl'>('en');
  const [searchResults, setSearchResults] = useState<UnifiedMember[]>([]);

  const handleSubmit = async () => {
    await onCreateAlert(alertForm);
    
    // Reset form
    setAlertForm({
      title: '',
      message: '',
      translations: {
        en: { title: '', message: '', actionText: '' },
        fr: { title: '', message: '', actionText: '' },
        de: { title: '', message: '', actionText: '' },
        es: { title: '', message: '', actionText: '' },
        it: { title: '', message: '', actionText: '' },
        nl: { title: '', message: '', actionText: '' }
      },
      type: 'info',
      targetAudience: 'members',
      organizationType: '',
      organizationSearch: '',
      selectedOrganizations: [],
      actionRequired: false,
      actionUrl: '',
      actionText: '',
      expiresAt: '',
      sendEmail: false
    });
    setCurrentLanguage('en');
    
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Create New Alert"
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Basic Alert Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alert Title *
            </label>
            <input
              type="text"
              value={alertForm.translations.en.title}
              onChange={(e) => setAlertForm(prev => ({
                ...prev,
                translations: {
                  ...prev.translations,
                  en: {
                    ...prev.translations.en,
                    title: e.target.value
                  }
                }
              }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              placeholder="Alert title"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alert Type
            </label>
            <select
              value={alertForm.type}
              onChange={(e) => setAlertForm(prev => ({ ...prev, type: e.target.value as any }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            >
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Audience
          </label>
          <select
            value={alertForm.targetAudience}
            onChange={(e) => setAlertForm(prev => ({ ...prev, targetAudience: e.target.value as any }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          >
            <option value="all">All Users</option>
            <option value="members">All Members</option>
            <option value="admins">Admins Only</option>
            <option value="member_type">By Organization Type</option>
            <option value="specific_members">Specific Organizations</option>
          </select>
        </div>

        {/* Organization Type Filter */}
        {alertForm.targetAudience === 'member_type' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Type
            </label>
            <select
              value={alertForm.organizationType}
              onChange={(e) => setAlertForm(prev => ({ ...prev, organizationType: e.target.value as any }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            >
              <option value="">Select Type</option>
              <option value="MGA">MGA</option>
              <option value="carrier">Carrier</option>
              <option value="provider">Provider</option>
            </select>
          </div>
        )}

        {/* Specific Organizations Selection */}
        {alertForm.targetAudience === 'specific_members' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search and Select Organizations
            </label>
            <input
              type="text"
              value={alertForm.organizationSearch}
              onChange={(e) => {
                const searchValue = e.target.value;
                setAlertForm(prev => ({ ...prev, organizationSearch: searchValue }));
                
                // Search within existing memberApplications data
                if (searchValue.trim()) {
                  const results = memberApplications
                    .filter(member => 
                      member.organizationName?.toLowerCase().includes(searchValue.toLowerCase()) &&
                      member.status === 'approved'
                    )
                    .filter((org, index, self) => 
                      index === self.findIndex(o => o.organizationName === org.organizationName)
                    )
                    .slice(0, 5);
                  setSearchResults(results);
                } else {
                  setSearchResults([]);
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              placeholder="Search organizations..."
            />
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                {searchResults.map(org => (
                  <div
                    key={org.id}
                    className="p-2 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      // Get all member IDs from this organization
                      const orgMemberIds = memberApplications
                        .filter(m => m.organizationName === org.organizationName)
                        .map(m => m.id);
                      
                      // Check if any members from this org are already selected
                      const alreadySelected = orgMemberIds.some(id => 
                        alertForm.selectedOrganizations.includes(id)
                      );
                      
                      if (!alreadySelected) {
                        setAlertForm(prev => ({
                          ...prev,
                          selectedOrganizations: [...prev.selectedOrganizations, ...orgMemberIds],
                          organizationSearch: ''
                        }));
                        setSearchResults([]);
                      }
                    }}
                  >
                    <div className="text-sm font-medium text-gray-900">{org.organizationName}</div>
                    <div className="text-xs text-gray-500">
                      {memberApplications.filter(m => m.organizationName === org.organizationName).length} members
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Selected Organizations */}
            {alertForm.selectedOrganizations.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Selected Organizations ({(() => {
                    const uniqueOrgNames = new Set(
                      alertForm.selectedOrganizations
                        .map(orgId => memberApplications.find(m => m.id === orgId)?.organizationName)
                        .filter(Boolean)
                    );
                    return uniqueOrgNames.size;
                  })()} organizations):
                </p>
                <div className="space-y-1">
                  {(() => {
                    // Get unique organizations by name
                    const selectedOrgs = alertForm.selectedOrganizations
                      .map(orgId => memberApplications.find(m => m.id === orgId))
                      .filter((org): org is UnifiedMember => org !== undefined)
                      .filter((org, index, self) => 
                        index === self.findIndex(o => o?.organizationName === org.organizationName)
                      );
                    
                    return selectedOrgs.map(org => (
                      <div key={org.organizationName} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <span className="text-sm font-medium text-gray-700">{org.organizationName}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({memberApplications.filter(m => m.organizationName === org.organizationName).length} members)
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            // Remove all members from this organization
                            const orgMemberIds = memberApplications
                              .filter(m => m.organizationName === org.organizationName)
                              .map(m => m.id);
                            
                            setAlertForm(prev => ({
                              ...prev,
                              selectedOrganizations: prev.selectedOrganizations.filter(
                                id => !orgMemberIds.includes(id)
                              )
                            }));
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Multi-language Content */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Content</h3>
          
          {/* Language Tabs */}
          <div className="flex space-x-2 mb-4 border-b">
            {(['en', 'fr', 'de', 'es', 'it', 'nl'] as const).map((locale) => (
              <button
                key={locale}
                onClick={() => setCurrentLanguage(locale)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  currentLanguage === locale
                    ? 'bg-fase-navy text-white border-b-2 border-fase-navy'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {locale.toUpperCase()}
                {alertForm.translations[locale]?.title && (
                  <span className="ml-1 text-green-400">✓</span>
                )}
              </button>
            ))}
          </div>

          {/* Title for current language */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title ({currentLanguage.toUpperCase()})
            </label>
            <input
              type="text"
              value={alertForm.translations[currentLanguage].title}
              onChange={(e) => setAlertForm(prev => ({
                ...prev,
                translations: {
                  ...prev.translations,
                  [currentLanguage]: {
                    ...prev.translations[currentLanguage],
                    title: e.target.value
                  }
                }
              }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              placeholder={`Alert title in ${currentLanguage.toUpperCase()}`}
            />
          </div>

          {/* Message Editor and Preview */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message ({currentLanguage.toUpperCase()}) - Markdown Supported
            </label>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Editor */}
              <div>
                <textarea
                  value={alertForm.translations[currentLanguage].message}
                  onChange={(e) => setAlertForm(prev => ({
                    ...prev,
                    translations: {
                      ...prev.translations,
                      [currentLanguage]: {
                        ...prev.translations[currentLanguage],
                        message: e.target.value
                      }
                    }
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  rows={6}
                  placeholder={`Alert message in ${currentLanguage.toUpperCase()}. Use **bold**, *italic*, [link](url)`}
                />
              </div>
              
              {/* Preview */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Preview:</div>
                <div 
                  className="border border-gray-300 rounded-lg px-3 py-2 min-h-[6rem] bg-gray-50 text-sm"
                  dangerouslySetInnerHTML={{ 
                    __html: alertForm.translations[currentLanguage].message 
                      ? renderMarkdown(alertForm.translations[currentLanguage].message) 
                      : '<span class="text-gray-400">Preview will appear here...</span>' 
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Text for current language */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action Button Text ({currentLanguage.toUpperCase()}) - Optional
            </label>
            <input
              type="text"
              value={alertForm.translations[currentLanguage].actionText}
              onChange={(e) => setAlertForm(prev => ({
                ...prev,
                translations: {
                  ...prev.translations,
                  [currentLanguage]: {
                    ...prev.translations[currentLanguage],
                    actionText: e.target.value
                  }
                }
              }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              placeholder={`Action button text in ${currentLanguage.toUpperCase()}`}
            />
          </div>
        </div>

        {/* Action Required */}
        <div className="border-t pt-4">
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="actionRequired"
              checked={alertForm.actionRequired}
              onChange={(e) => setAlertForm(prev => ({ ...prev, actionRequired: e.target.checked }))}
              className="h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
            />
            <label htmlFor="actionRequired" className="ml-2 text-sm text-gray-700">
              Include action button
            </label>
          </div>

          {alertForm.actionRequired && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action URL *
              </label>
              <input
                type="url"
                value={alertForm.actionUrl}
                onChange={(e) => setAlertForm(prev => ({ ...prev, actionUrl: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                placeholder="https://example.com"
                required
              />
            </div>
          )}
        </div>

        {/* Email Notification */}
        <div className="border-t pt-4">
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="sendEmail"
              checked={alertForm.sendEmail}
              onChange={(e) => setAlertForm(prev => ({ ...prev, sendEmail: e.target.checked }))}
              className="h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
            />
            <label htmlFor="sendEmail" className="ml-2 text-sm text-gray-700">
              Send email notification to affected users
            </label>
          </div>
          {alertForm.sendEmail && (
            <div className="ml-6 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                Email notifications will be sent to all users in the selected audience.
              </p>
            </div>
          )}
        </div>

        {/* Expiration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expires At (Optional)
          </label>
          <input
            type="datetime-local"
            value={alertForm.expiresAt}
            onChange={(e) => setAlertForm(prev => ({ ...prev, expiresAt: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={!alertForm.translations.en.title || !alertForm.translations.en.message}
          >
            Create Alert
          </Button>
        </div>
      </div>
    </Modal>
  );
}