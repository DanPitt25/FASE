'use client';

import { useState, useEffect } from 'react';
import Modal from '../../../components/Modal';
import Button from '../../../components/Button';

type EmailTemplate = Record<string, any>;

interface EmailEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (customizedContent: any) => void;
  recipientData: {
    email: string;
    fullName: string;
    organizationName: string;
    totalAmount: string;
  };
  originalTemplate: EmailTemplate;
}

export default function EmailEditorModal({ 
  isOpen, 
  onClose, 
  onApply, 
  recipientData, 
  originalTemplate
}: EmailEditorModalProps) {
  const [editedContent, setEditedContent] = useState<EmailTemplate>({});
  const [showPreview, setShowPreview] = useState(false);

  // Reset edited content when modal opens or template changes
  useEffect(() => {
    if (isOpen && originalTemplate) {
      console.log('Initializing EmailEditorModal with template:', originalTemplate);
      setEditedContent({ ...originalTemplate });
    }
  }, [isOpen, originalTemplate]);

  const handleInputChange = (field: keyof EmailTemplate, value: string) => {
    setEditedContent(prev => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    // Pass the customized content to the parent component to update the preview
    onApply(editedContent);
    onClose();
  };

  const replaceVariables = (text: string) => {
    return text
      .replace(/{organizationName}/g, recipientData.organizationName)
      .replace(/{fullName}/g, recipientData.fullName)
      .replace(/{totalAmount}/g, recipientData.totalAmount);
  };

  // Get the most important fields to edit based on template structure
  const getEditableFields = () => {
    const fields = [];
    const skipFields = ['dear_m', 'dear_f', 'subject_m', 'subject_f', 'welcome_m', 'welcome_f', 'greeting_m', 'greeting_f', 'congratulations_m', 'congratulations_f', 'reminder_text_m', 'reminder_text_f']; // Skip gender variants
    
    for (const [key, value] of Object.entries(originalTemplate)) {
      if (typeof value === 'string' && !skipFields.includes(key)) {
        fields.push({
          key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: editedContent[key] || '', // Start with edited value or empty for customization
          placeholder: value, // Show original value as placeholder
          multiline: value.length > 100 || key.includes('text') || key.includes('intro') || key.includes('message') || key.includes('description') || key.includes('instruction') || key.includes('access') || key.includes('portal') || key.includes('directory') || key.includes('closing') || key.includes('benefits') || key.includes('congratulations')
        });
      }
    }
    
    return fields.sort((a, b) => {
      // Sort important fields first
      const importantFields = ['subject', 'dear', 'welcome', 'greeting', 'intro', 'text', 'title'];
      const aImportant = importantFields.some(field => a.key.includes(field));
      const bImportant = importantFields.some(field => b.key.includes(field));
      
      if (aImportant && !bImportant) return -1;
      if (!aImportant && bImportant) return 1;
      return a.key.localeCompare(b.key);
    });
  };

  const generatePreview = () => {
    // Generate a generic preview showing all the field values (customized or original)
    const previewContent = Object.entries(originalTemplate)
      .filter(([key, value]) => typeof value === 'string' && !['dear_m', 'dear_f', 'subject_m', 'subject_f', 'welcome_m', 'welcome_f', 'greeting_m', 'greeting_f', 'congratulations_m', 'congratulations_f', 'reminder_text_m', 'reminder_text_f'].includes(key))
      .map(([key, originalValue]) => {
        // Use customized value if available, otherwise use original
        const value = editedContent[key] || originalValue;
        const displayValue = replaceVariables(value);
        const isCustomized = editedContent[key] && editedContent[key] !== originalValue;
        return `<p style="margin: 10px 0;${isCustomized ? 'background-color: #fef3cd; padding: 5px; border-radius: 3px;' : ''}"><strong>${key.replace(/_/g, ' ')}:</strong> ${displayValue}${isCustomized ? ' <em>(customized)</em>' : ''}</p>`;
      })
      .join('');
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
          </div>
          ${previewContent}
        </div>
      </div>
    `;
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Customize Email Content"
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            Sending to: {recipientData.fullName} ({recipientData.email})
          </h3>
          <p className="text-sm text-blue-800">
            <strong>Available variables:</strong> {'{organizationName}'}, {'{totalAmount}'}, {'{fullName}'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Panel */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-semibold text-fase-navy">Edit Email Content</h4>
              <Button
                variant="secondary"
                onClick={() => setShowPreview(!showPreview)}
                size="small"
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
            </div>

            {/* Dynamic Fields */}
            {getEditableFields().map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                </label>
                {field.multiline ? (
                  <textarea
                    value={field.value}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                  />
                ) : (
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-fase-navy">Email Preview</h4>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="text-sm text-gray-600 mb-3">
                  <strong>Subject:</strong> {editedContent.subject || originalTemplate.subject}
                </div>
                <div 
                  className="bg-white rounded border"
                  dangerouslySetInnerHTML={{ __html: generatePreview() }}
                  style={{ maxHeight: '500px', overflowY: 'auto' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button 
            variant="secondary" 
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleApply}
          >
            Apply Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}