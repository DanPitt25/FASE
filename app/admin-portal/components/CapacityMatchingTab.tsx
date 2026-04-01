'use client';

import { useState, useEffect, useMemo } from 'react';
import Button from '../../../components/Button';
import Modal from '../../../components/Modal';
import { authFetch, authDelete } from '../../../lib/auth-fetch';
import * as XLSX from 'xlsx';
import type { CapacityMatchingSubmission, CapacityMatchingEntry } from '../../../lib/capacity-matching-constants';
import {
  SupportedLanguage,
  LANGUAGE_LABELS,
  generateMagicLinkEmailHtml,
  magicLinkEmailTranslations,
} from '../../../lib/capacity-matching-email-translations';

interface Submission extends Omit<CapacityMatchingSubmission, 'createdAt' | 'updatedAt'> {
  createdAt: string | null;
  updatedAt: string | null;
}

export default function CapacityMatchingTab() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Detail modal
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Delete modal
  const [deleteSubmission, setDeleteSubmission] = useState<Submission | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Magic link generation
  const [showGenerateLinkModal, setShowGenerateLinkModal] = useState(false);
  const [linkCompanyName, setLinkCompanyName] = useState('');
  const [linkEmail, setLinkEmail] = useState('');
  const [linkLanguage, setLinkLanguage] = useState<SupportedLanguage>('en');
  const [sendEmailWithLink, setSendEmailWithLink] = useState(true);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authFetch('/api/admin/capacity-matching');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch submissions');
      }

      setSubmissions(data.submissions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  // Filter submissions by search
  const filteredSubmissions = submissions.filter((s) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.organizationName?.toLowerCase().includes(query) ||
      s.contactName?.toLowerCase().includes(query) ||
      s.contactEmail?.toLowerCase().includes(query)
    );
  });

  // Generate email preview HTML
  const emailPreviewHtml = useMemo(() => {
    const previewExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
    return generateMagicLinkEmailHtml(
      linkCompanyName || 'Company Name',
      'https://fasemga.com/capacity-matching?token=PREVIEW&email=preview@example.com',
      previewExpiry,
      linkLanguage
    );
  }, [linkCompanyName, linkLanguage]);

  // Export single submission to Excel
  const exportSubmissionToExcel = (submission: Submission) => {
    const workbook = XLSX.utils.book_new();

    // Create data for sheet
    const data = submission.entries.map((entry) => ({
      'Line of Business': entry.lineOfBusiness,
      'Country': entry.country,
      'GWP In This Country 2025 (€)': entry.gwp2025,
      'Targeted New Premium Year 1 (€)': entry.targetYear1,
      'Targeted New Premium Year 2 (€)': entry.targetYear2,
      'Targeted New Premium Year 3 (€)': entry.targetYear3,
      'Notes': entry.notes,
    }));

    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Growth Targets');

    // Add metadata sheet
    const metaSheet = XLSX.utils.json_to_sheet([
      { Field: 'Company', Value: submission.organizationName },
      { Field: 'Contact Name', Value: submission.contactName },
      { Field: 'Contact Email', Value: submission.contactEmail },
      { Field: 'Submission Date', Value: submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : 'N/A' },
    ]);
    XLSX.utils.book_append_sheet(workbook, metaSheet, 'Submission Info');

    const filename = `Capacity-Matching-${submission.organizationName.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  // Export all submissions to Excel
  const exportAllToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // All entries with company info
    const allEntries: any[] = [];
    submissions.forEach((submission) => {
      submission.entries.forEach((entry) => {
        allEntries.push({
          'Company': submission.organizationName,
          'Contact': submission.contactName,
          'Email': submission.contactEmail,
          'Submission Date': submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : 'N/A',
          'Line of Business': entry.lineOfBusiness,
          'Country': entry.country,
          'GWP 2025 (€)': entry.gwp2025,
          'Target Year 1 (€)': entry.targetYear1,
          'Target Year 2 (€)': entry.targetYear2,
          'Target Year 3 (€)': entry.targetYear3,
          'Notes': entry.notes,
        });
      });
    });

    const sheet = XLSX.utils.json_to_sheet(allEntries);
    XLSX.utils.book_append_sheet(workbook, sheet, 'All Submissions');

    // Summary sheet
    const summary = submissions.map((s) => ({
      'Company': s.organizationName,
      'Contact': s.contactName,
      'Email': s.contactEmail,
      'Entries': s.entries.length,
      'Submission Date': s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A',
    }));
    const summarySheet = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    XLSX.writeFile(workbook, `Capacity-Matching-All-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Handle generate magic link
  const handleGenerateLink = async () => {
    if (!linkCompanyName.trim() || !linkEmail.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setGeneratingLink(true);
      const response = await authFetch('/api/admin/capacity-matching/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: linkCompanyName.trim(),
          contactEmail: linkEmail.trim(),
          sendEmail: sendEmailWithLink,
          language: linkLanguage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate link');
      }

      setGeneratedLink(data.url);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyLinkToClipboard = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const resetLinkModal = () => {
    setShowGenerateLinkModal(false);
    setLinkCompanyName('');
    setLinkEmail('');
    setLinkLanguage('en');
    setSendEmailWithLink(true);
    setGeneratedLink(null);
    setLinkCopied(false);
    setShowEmailPreview(false);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteSubmission) return;

    try {
      setDeleting(true);
      const response = await authDelete(`/api/admin/capacity-matching?id=${deleteSubmission.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete');
      }

      setSubmissions(submissions.filter((s) => s.id !== deleteSubmission.id));
      setShowDeleteModal(false);
      setDeleteSubmission(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
        {error}
        <Button onClick={loadSubmissions} variant="secondary" size="small" className="ml-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search by company, contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent w-64"
          />
          <span className="text-sm text-gray-500">
            {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowGenerateLinkModal(true)}
            variant="secondary"
          >
            Generate Magic Link
          </Button>
          <Button
            onClick={exportAllToExcel}
            variant="secondary"
            disabled={submissions.length === 0}
          >
            Export All to Excel
          </Button>
        </div>
      </div>

      {/* Table */}
      {filteredSubmissions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchQuery ? 'No submissions match your search' : 'No submissions yet'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Company</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Contact</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Email</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Entries</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Submitted</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((submission) => (
                <tr key={submission.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                    {submission.organizationName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {submission.contactName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {submission.contactEmail}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">
                    {submission.entries.length}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {submission.createdAt
                      ? new Date(submission.createdAt).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setShowDetailModal(true);
                        }}
                        className="text-fase-navy hover:text-fase-orange text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => exportSubmissionToExcel(submission)}
                        className="text-fase-navy hover:text-fase-orange text-sm"
                      >
                        Export
                      </button>
                      <button
                        onClick={() => {
                          setDeleteSubmission(submission);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedSubmission(null);
        }}
        title="Submission Details"
        maxWidth="4xl"
      >
        {selectedSubmission && (
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Company</span>
                  <p className="font-medium text-gray-900">{selectedSubmission.organizationName}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Contact</span>
                  <p className="font-medium text-gray-900">{selectedSubmission.contactName}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Email</span>
                  <p className="font-medium text-gray-900">{selectedSubmission.contactEmail}</p>
                </div>
              </div>
            </div>

            {/* Entries Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left px-3 py-2 font-semibold">Line of Business</th>
                    <th className="text-left px-3 py-2 font-semibold">Country</th>
                    <th className="text-right px-3 py-2 font-semibold">GWP 2025</th>
                    <th className="text-right px-3 py-2 font-semibold">Year 1</th>
                    <th className="text-right px-3 py-2 font-semibold">Year 2</th>
                    <th className="text-right px-3 py-2 font-semibold">Year 3</th>
                    <th className="text-left px-3 py-2 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSubmission.entries.map((entry, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="px-3 py-2">{entry.lineOfBusiness}</td>
                      <td className="px-3 py-2">{entry.country}</td>
                      <td className="px-3 py-2 text-right">€{entry.gwp2025.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">€{entry.targetYear1.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">€{entry.targetYear2.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">€{entry.targetYear3.toLocaleString()}</td>
                      <td className="px-3 py-2 text-gray-600">{entry.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => exportSubmissionToExcel(selectedSubmission)}
                variant="secondary"
              >
                Export to Excel
              </Button>
              <Button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedSubmission(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteSubmission(null);
        }}
        title="Delete Submission"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete the submission from{' '}
            <strong>{deleteSubmission?.organizationName}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteSubmission(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Generate Magic Link Modal */}
      <Modal
        isOpen={showGenerateLinkModal}
        onClose={resetLinkModal}
        title="Generate Magic Link"
        maxWidth={showEmailPreview ? '4xl' : 'md'}
      >
        <div className="space-y-4">
          {!generatedLink ? (
            <div className={showEmailPreview ? 'grid grid-cols-2 gap-6' : ''}>
              {/* Form Section */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={linkCompanyName}
                    onChange={(e) => setLinkCompanyName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    disabled={generatingLink}
                    placeholder="Company name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    disabled={generatingLink}
                    placeholder="contact@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Language
                  </label>
                  <select
                    value={linkLanguage}
                    onChange={(e) => setLinkLanguage(e.target.value as SupportedLanguage)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    disabled={generatingLink}
                  >
                    {(Object.keys(LANGUAGE_LABELS) as SupportedLanguage[]).map((lang) => (
                      <option key={lang} value={lang}>
                        {LANGUAGE_LABELS[lang]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="sendEmail"
                      checked={sendEmailWithLink}
                      onChange={(e) => setSendEmailWithLink(e.target.checked)}
                      className="rounded border-gray-300 text-fase-navy focus:ring-fase-navy"
                      disabled={generatingLink}
                    />
                    <label htmlFor="sendEmail" className="text-sm text-gray-700">
                      Send email with link
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEmailPreview(!showEmailPreview)}
                    className="text-sm text-fase-navy hover:text-fase-orange"
                  >
                    {showEmailPreview ? 'Hide Preview' : 'Preview Email'}
                  </button>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="secondary"
                    onClick={resetLinkModal}
                    disabled={generatingLink}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGenerateLink}
                    disabled={generatingLink || !linkCompanyName.trim() || !linkEmail.trim()}
                  >
                    {generatingLink ? 'Generating...' : 'Generate Link'}
                  </Button>
                </div>
              </div>

              {/* Email Preview Section */}
              {showEmailPreview && (
                <div className="border-l pl-6">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Email Preview</span>
                    <span className="text-xs text-gray-500">
                      Subject: {magicLinkEmailTranslations[linkLanguage].subject} - {linkCompanyName || 'Company Name'}
                    </span>
                  </div>
                  <div
                    className="border rounded-lg bg-white overflow-auto max-h-[400px]"
                    dangerouslySetInnerHTML={{ __html: emailPreviewHtml }}
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium text-green-800">Link Generated!</span>
                </div>
                {sendEmailWithLink && (
                  <p className="text-sm text-green-700">
                    An email has been sent to {linkEmail} in {LANGUAGE_LABELS[linkLanguage]}.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Magic Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                  <Button
                    onClick={copyLinkToClipboard}
                    variant="secondary"
                    size="small"
                  >
                    {linkCopied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This link is valid for 48 hours and can only be used once.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setGeneratedLink(null);
                    setLinkCompanyName('');
                    setLinkEmail('');
                    setShowEmailPreview(false);
                  }}
                >
                  Generate Another
                </Button>
                <Button onClick={resetLinkModal}>
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
