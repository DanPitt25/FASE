'use client';

import { useState, useEffect } from 'react';
import Modal from '../../../components/Modal';
import Button from '../../../components/Button';

interface EmailTemplate {
  subject: string;
  welcome: string;
  dear: string;
  welcome_text: string;
  payment_text: string;
  payment_button: string;
  bank_transfer_text: string;
  engagement: string;
  regards: string;
  signature: string;
  name: string;
  title: string;
  email: string;
}

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
  const [editedContent, setEditedContent] = useState<EmailTemplate>({ ...originalTemplate });
  const [showPreview, setShowPreview] = useState(false);

  // Reset edited content when modal opens or template changes
  useEffect(() => {
    setEditedContent({ ...originalTemplate });
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

  const generatePreview = () => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
          </div>
          <h2 style="color: #2D5574; margin: 0 0 20px 0; font-size: 20px;">${editedContent.welcome}</h2>
          
          <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
            ${editedContent.dear} ${recipientData.fullName},
          </p>
          
          <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
            ${replaceVariables(editedContent.welcome_text).replace(recipientData.organizationName, `<strong>${recipientData.organizationName}</strong>`)}
          </p>
          
          <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 25px 0;">
            ${replaceVariables(editedContent.payment_text)}
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-size: 15px;">
              <strong>1. PayPal:</strong> <a href="#" style="color: #2D5574; text-decoration: none;">${editedContent.payment_button}</a>
            </p>
            
            <p style="margin: 0; font-size: 15px;">
              <strong>2. Bank Transfer:</strong> ${editedContent.bank_transfer_text}
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 15px 0;">
            ${editedContent.engagement}
          </p>
          
          <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 15px 0 0 0;">
            ${editedContent.regards}<br><br>
            <strong>${editedContent.signature}</strong><br><br>
            ${editedContent.name}<br>
            ${editedContent.title}<br>
            <a href="mailto:${editedContent.email}" style="color: #2D5574;">${editedContent.email}</a>
          </p>
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

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Subject
              </label>
              <input
                type="text"
                value={editedContent.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>

            {/* Welcome Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Title
              </label>
              <input
                type="text"
                value={editedContent.welcome}
                onChange={(e) => handleInputChange('welcome', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>

            {/* Greeting */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Greeting
              </label>
              <input
                type="text"
                value={editedContent.dear}
                onChange={(e) => handleInputChange('dear', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>

            {/* Welcome Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Welcome Message
              </label>
              <textarea
                value={editedContent.welcome_text}
                onChange={(e) => handleInputChange('welcome_text', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>

            {/* Payment Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Instructions
              </label>
              <textarea
                value={editedContent.payment_text}
                onChange={(e) => handleInputChange('payment_text', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>

            {/* Engagement Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Closing Message
              </label>
              <textarea
                value={editedContent.engagement}
                onChange={(e) => handleInputChange('engagement', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-fase-navy">Email Preview</h4>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="text-sm text-gray-600 mb-3">
                  <strong>Subject:</strong> {editedContent.subject}
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