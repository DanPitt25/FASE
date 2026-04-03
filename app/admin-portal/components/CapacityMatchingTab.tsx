'use client';

import { useState, useEffect, useMemo } from 'react';
import Button from '../../../components/Button';
import Modal from '../../../components/Modal';
import RichTextEditor from '../../../components/RichTextEditor';
import { authFetch, authDelete } from '../../../lib/auth-fetch';
import * as XLSX from 'xlsx';
import type { CapacityMatchingSubmission, CapacityMatchingEntry } from '../../../lib/capacity-matching-constants';
import {
  SupportedLanguage,
  SalutationType,
  LANGUAGE_LABELS,
  SALUTATION_LABELS,
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

  // Magic link generation - single
  const [showGenerateLinkModal, setShowGenerateLinkModal] = useState(false);
  const [linkCompanyName, setLinkCompanyName] = useState('');
  const [linkFirstName, setLinkFirstName] = useState('');
  const [linkFullName, setLinkFullName] = useState('');
  const [linkEmail, setLinkEmail] = useState('');
  const [linkLanguage, setLinkLanguage] = useState<SupportedLanguage>('en');
  const [linkSalutation, setLinkSalutation] = useState<SalutationType>('neutral');
  const [sendEmailWithLink, setSendEmailWithLink] = useState(true);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Custom email editing for single link mode
  const [singleCustomEmailMode, setSingleCustomEmailMode] = useState(false);
  const [singleCustomEmailSubject, setSingleCustomEmailSubject] = useState('');
  const [singleCustomEmailHtml, setSingleCustomEmailHtml] = useState('');

  // Magic link generation - bulk CSV/XLSX
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [csvRecipients, setCsvRecipients] = useState<Array<{
    companyName: string;
    firstName: string;
    fullName: string;
    email: string;
    suggestedLanguage?: string;
    title?: string;
  }>>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvError, setCsvError] = useState('');

  // Bulk step-through mode
  const [bulkStepMode, setBulkStepMode] = useState(false);
  const [currentBulkIndex, setCurrentBulkIndex] = useState(0);
  const [currentBulkLanguage, setCurrentBulkLanguage] = useState<SupportedLanguage>('en');
  const [currentBulkSalutation, setCurrentBulkSalutation] = useState<SalutationType>('neutral');
  const [sendingCurrentBulk, setSendingCurrentBulk] = useState(false);
  const [bulkResults, setBulkResults] = useState<Array<{
    email: string;
    companyName: string;
    success: boolean;
    error?: string;
    language: SupportedLanguage;
  }>>([]);

  // Custom email editing for bulk mode
  const [customEmailMode, setCustomEmailMode] = useState(false);
  const [customEmailSubject, setCustomEmailSubject] = useState('');
  const [customEmailHtml, setCustomEmailHtml] = useState('');

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

  // Generate email preview HTML with live form data
  const emailPreviewHtml = useMemo(() => {
    return generateMagicLinkEmailHtml(
      linkCompanyName || '{{Company Name}}',
      linkFirstName || '{{First Name}}',
      '{{MAGIC_LINK_URL}}',
      linkLanguage,
      linkSalutation
    );
  }, [linkCompanyName, linkFirstName, linkLanguage, linkSalutation]);

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
    if (!linkCompanyName.trim() || !linkFirstName.trim() || !linkFullName.trim() || !linkEmail.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setGeneratingLink(true);

      const requestBody: any = {
        companyName: linkCompanyName.trim(),
        firstName: linkFirstName.trim(),
        fullName: linkFullName.trim(),
        contactEmail: linkEmail.trim(),
        sendEmail: sendEmailWithLink,
        language: linkLanguage,
        salutation: linkSalutation,
      };

      // Add custom email content if in custom mode
      if (singleCustomEmailMode && singleCustomEmailHtml) {
        requestBody.customHtml = singleCustomEmailHtml;
        requestBody.customSubject = singleCustomEmailSubject || undefined;
      }

      const response = await authFetch('/api/admin/capacity-matching/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
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

  // Parse rows from headers and data (shared between CSV and XLSX)
  const parseRecipientsFromRows = (headers: string[], rows: string[][]) => {
    // Normalize headers: lowercase, trim, remove BOM and non-breaking spaces
    const normalizedHeaders = headers.map(h =>
      h.toLowerCase().trim().replace(/^\ufeff/, '').replace(/\u00a0/g, ' ')
    );

    // Find column indices - support multiple naming conventions
    const emailIndex = normalizedHeaders.findIndex(h =>
      h === 'email' || h === 'e-mail' || h === 'email address'
    );
    const companyIndex = normalizedHeaders.findIndex(h =>
      h === 'company' || h === 'organization' || h === 'organisation' || h === 'company name'
    );
    const firstNameIndex = normalizedHeaders.findIndex(h =>
      h === 'first name' || h === 'firstname' || h === 'first'
    );
    const surnameIndex = normalizedHeaders.findIndex(h =>
      h === 'surname' || h === 'last name' || h === 'lastname' || h === 'last'
    );
    // Also check for a combined "full name" column as fallback
    const fullNameIndex = normalizedHeaders.findIndex(h =>
      h === 'full name' || h === 'fullname' || h === 'name' || h === 'contact name' || h === 'contact'
    );
    // Language column (advisory only)
    const languageIndex = normalizedHeaders.findIndex(h =>
      h === 'language' || h === 'lang'
    );
    // Title column (advisory only)
    const titleIndex = normalizedHeaders.findIndex(h =>
      h === 'title'
    );

    if (emailIndex === -1) {
      setCsvError('File must have an "email" column');
      setCsvRecipients([]);
      return;
    }

    if (companyIndex === -1) {
      setCsvError('File must have a "company" column');
      setCsvRecipients([]);
      return;
    }

    if (firstNameIndex === -1) {
      setCsvError('File must have a "first name" column');
      setCsvRecipients([]);
      return;
    }

    // Need either surname OR full name column
    if (surnameIndex === -1 && fullNameIndex === -1) {
      setCsvError('File must have a "surname" or "full name" column');
      setCsvRecipients([]);
      return;
    }

    const parsed: Array<{
      companyName: string;
      firstName: string;
      fullName: string;
      email: string;
      suggestedLanguage?: string;
      title?: string;
    }> = [];

    for (const row of rows) {
      const email = (row[emailIndex] || '').trim();
      if (!email || !email.includes('@')) continue;

      const companyName = (row[companyIndex] || '').trim();
      const firstName = (row[firstNameIndex] || '').trim();

      // Combine first name + surname for full name, or use full name column
      let fullName = '';
      if (surnameIndex !== -1) {
        const surname = (row[surnameIndex] || '').trim();
        fullName = `${firstName} ${surname}`.trim();
      } else if (fullNameIndex !== -1) {
        fullName = (row[fullNameIndex] || '').trim();
      }

      if (!companyName || !firstName || !fullName) continue;

      const recipient: typeof parsed[0] = {
        email,
        companyName,
        firstName,
        fullName,
      };

      // Add advisory fields if present
      if (languageIndex !== -1) {
        recipient.suggestedLanguage = (row[languageIndex] || '').trim();
      }
      if (titleIndex !== -1) {
        recipient.title = (row[titleIndex] || '').trim();
      }

      parsed.push(recipient);
    }

    if (parsed.length === 0) {
      setCsvError('No valid rows found');
      setCsvRecipients([]);
      return;
    }

    setCsvRecipients(parsed);
  };

  // Handle file upload (CSV or XLSX)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvError('');
    setCsvFileName(file.name);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      // Parse XLSX using the already-imported XLSX library
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });

          if (jsonData.length === 0) {
            setCsvError('File is empty');
            setCsvRecipients([]);
            return;
          }

          const headers = (jsonData[0] as string[]).map(h =>
            String(h || '').toLowerCase().trim().replace(/^\ufeff/, '') // Remove BOM and trim
          );
          const rows = jsonData.slice(1).map(row =>
            (row as string[]).map(cell => String(cell || '').trim())
          );

          parseRecipientsFromRows(headers, rows);
        } catch (err) {
          setCsvError('Failed to parse Excel file');
          setCsvRecipients([]);
        }
      };
      reader.onerror = () => {
        setCsvError('Failed to read file');
        setCsvRecipients([]);
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Parse CSV
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split(/\r?\n/).filter(line => line.trim());

          if (lines.length === 0) {
            setCsvError('File is empty');
            setCsvRecipients([]);
            return;
          }

          // Parse CSV lines
          const parseCSVLine = (line: string): string[] => {
            const values: string[] = [];
            let current = '';
            let inQuotes = false;
            for (const char of line) {
              if (char === '"' && !inQuotes) {
                inQuotes = true;
              } else if (char === '"' && inQuotes) {
                inQuotes = false;
              } else if ((char === ',' || char === '\t') && !inQuotes) {
                values.push(current.trim().replace(/^["']|["']$/g, ''));
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current.trim().replace(/^["']|["']$/g, ''));
            return values;
          };

          const headers = parseCSVLine(lines[0]).map(h =>
            h.toLowerCase().trim().replace(/^\ufeff/, '') // Remove BOM and trim
          );
          const rows = lines.slice(1).map(parseCSVLine);

          parseRecipientsFromRows(headers, rows);
        } catch (err) {
          setCsvError('Failed to parse file');
          setCsvRecipients([]);
        }
      };
      reader.onerror = () => {
        setCsvError('Failed to read file');
        setCsvRecipients([]);
      };
      reader.readAsText(file);
    }

    event.target.value = '';
  };

  const clearCsv = () => {
    setCsvRecipients([]);
    setCsvFileName('');
    setCsvError('');
  };

  const resetBulkModal = () => {
    setShowBulkModal(false);
    clearCsv();
    setBulkStepMode(false);
    setCurrentBulkIndex(0);
    setCurrentBulkLanguage('en');
    setCurrentBulkSalutation('neutral');
    setBulkResults([]);
    resetCustomEmail();
  };

  // Start step-through mode
  const startBulkStepMode = () => {
    setBulkStepMode(true);
    setCurrentBulkIndex(0);
    setBulkResults([]);
    setCurrentBulkLanguage('en');
    setCurrentBulkSalutation('neutral');
  };

  // Send current recipient in step-through mode
  const handleSendCurrentBulk = async () => {
    const recipient = csvRecipients[currentBulkIndex];
    if (!recipient) return;

    setSendingCurrentBulk(true);

    try {
      const requestBody: any = {
        companyName: recipient.companyName,
        firstName: recipient.firstName,
        fullName: recipient.fullName,
        contactEmail: recipient.email,
        sendEmail: true,
        language: currentBulkLanguage,
        salutation: currentBulkSalutation,
      };

      // Add custom email content if in custom mode
      if (customEmailMode && customEmailHtml) {
        requestBody.customHtml = customEmailHtml;
        requestBody.customSubject = customEmailSubject || undefined;
      }

      const response = await authFetch('/api/admin/capacity-matching/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        setBulkResults(prev => [...prev, {
          email: recipient.email,
          companyName: recipient.companyName,
          success: false,
          error: data.error || 'Failed',
          language: currentBulkLanguage,
        }]);
      } else {
        setBulkResults(prev => [...prev, {
          email: recipient.email,
          companyName: recipient.companyName,
          success: true,
          language: currentBulkLanguage,
        }]);
        // Reset custom email and auto-advance to next
        resetCustomEmail();
        if (currentBulkIndex < csvRecipients.length - 1) {
          setCurrentBulkIndex(prev => prev + 1);
        }
      }
    } catch (err: any) {
      setBulkResults(prev => [...prev, {
        email: recipient.email,
        companyName: recipient.companyName,
        success: false,
        error: err.message,
        language: currentBulkLanguage,
      }]);
    } finally {
      setSendingCurrentBulk(false);
    }
  };

  // Skip current recipient
  const handleSkipCurrentBulk = () => {
    const recipient = csvRecipients[currentBulkIndex];
    if (recipient) {
      setBulkResults(prev => [...prev, {
        email: recipient.email,
        companyName: recipient.companyName,
        success: false,
        error: 'Skipped',
        language: currentBulkLanguage,
      }]);
    }
    resetCustomEmail();
    if (currentBulkIndex < csvRecipients.length - 1) {
      setCurrentBulkIndex(prev => prev + 1);
    }
  };

  // Generate preview HTML for current bulk recipient
  const currentBulkPreviewHtml = useMemo(() => {
    if (customEmailMode && customEmailHtml) {
      return customEmailHtml;
    }
    const recipient = csvRecipients[currentBulkIndex];
    if (!recipient) return '';
    return generateMagicLinkEmailHtml(
      recipient.companyName,
      recipient.firstName,
      'https://fasemga.com/capacity-matching?token=PREVIEW&email=preview@example.com',
      currentBulkLanguage,
      currentBulkSalutation
    );
  }, [csvRecipients, currentBulkIndex, currentBulkLanguage, currentBulkSalutation, customEmailMode, customEmailHtml]);

  // Initialize custom email content when entering custom mode
  const initializeCustomEmail = () => {
    const recipient = csvRecipients[currentBulkIndex];
    if (!recipient) return;
    const t = magicLinkEmailTranslations[currentBulkLanguage];
    setCustomEmailSubject(t.subject);
    setCustomEmailHtml(generateMagicLinkEmailHtml(
      recipient.companyName,
      recipient.firstName,
      '{{MAGIC_LINK_URL}}', // Placeholder that will be replaced when sending
      currentBulkLanguage,
      currentBulkSalutation
    ));
    setCustomEmailMode(true);
  };

  // Reset custom email when moving to next recipient
  const resetCustomEmail = () => {
    setCustomEmailMode(false);
    setCustomEmailSubject('');
    setCustomEmailHtml('');
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
    setLinkFirstName('');
    setLinkFullName('');
    setLinkEmail('');
    setLinkLanguage('en');
    setLinkSalutation('neutral');
    setSendEmailWithLink(true);
    setGeneratedLink(null);
    setLinkCopied(false);
    setSingleCustomEmailMode(false);
    setSingleCustomEmailSubject('');
    setSingleCustomEmailHtml('');
  };

  // Initialize custom email for single link mode
  const initializeSingleCustomEmail = () => {
    const t = magicLinkEmailTranslations[linkLanguage];
    setSingleCustomEmailSubject(t.subject);
    setSingleCustomEmailHtml(generateMagicLinkEmailHtml(
      linkCompanyName || '{{Company Name}}',
      linkFirstName || '{{First Name}}',
      '{{MAGIC_LINK_URL}}',
      linkLanguage,
      linkSalutation
    ));
    setSingleCustomEmailMode(true);
  };

  const resetSingleCustomEmail = () => {
    setSingleCustomEmailMode(false);
    setSingleCustomEmailSubject('');
    setSingleCustomEmailHtml('');
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
            onClick={() => setShowBulkModal(true)}
            variant="secondary"
          >
            Bulk Magic Links (CSV)
          </Button>
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
        maxWidth={sendEmailWithLink ? '4xl' : 'md'}
      >
        <div className="space-y-4">
          {!generatedLink ? (
            <div className={sendEmailWithLink ? 'grid grid-cols-2 gap-6' : ''}>
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={linkFirstName}
                      onChange={(e) => setLinkFirstName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      disabled={generatingLink}
                      placeholder="For email salutation"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={linkFullName}
                      onChange={(e) => setLinkFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      disabled={generatingLink}
                      placeholder="For form pre-fill"
                    />
                  </div>
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Language
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Salutation
                    </label>
                    <select
                      value={linkSalutation}
                      onChange={(e) => setLinkSalutation(e.target.value as SalutationType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      disabled={generatingLink}
                    >
                      {(Object.keys(SALUTATION_LABELS) as SalutationType[]).map((sal) => (
                        <option key={sal} value={sal}>
                          {SALUTATION_LABELS[sal]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendEmail"
                    checked={sendEmailWithLink}
                    onChange={(e) => {
                      setSendEmailWithLink(e.target.checked);
                      if (!e.target.checked) {
                        resetSingleCustomEmail();
                      }
                    }}
                    className="rounded border-gray-300 text-fase-navy focus:ring-fase-navy"
                    disabled={generatingLink}
                  />
                  <label htmlFor="sendEmail" className="text-sm text-gray-700">
                    Send email with link
                  </label>
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
                    disabled={generatingLink || !linkCompanyName.trim() || !linkFirstName.trim() || !linkFullName.trim() || !linkEmail.trim()}
                  >
                    {generatingLink ? 'Generating...' : 'Generate Link'}
                  </Button>
                </div>
              </div>

              {/* Email Edit Section - shown when sending email */}
              {sendEmailWithLink && (
                <div className="border-l pl-6">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Email Content
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {LANGUAGE_LABELS[linkLanguage]}
                      </span>
                      {singleCustomEmailMode && (
                        <button
                          type="button"
                          onClick={resetSingleCustomEmail}
                          className="text-xs text-red-600 hover:text-red-800"
                          disabled={generatingLink}
                        >
                          Reset to Template
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={singleCustomEmailSubject || magicLinkEmailTranslations[linkLanguage].subject}
                        onChange={(e) => {
                          if (!singleCustomEmailMode) {
                            initializeSingleCustomEmail();
                          }
                          setSingleCustomEmailSubject(e.target.value);
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-fase-navy focus:border-transparent"
                        disabled={generatingLink}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Email Body
                      </label>
                      <RichTextEditor
                        content={singleCustomEmailHtml || emailPreviewHtml}
                        onChange={(html) => {
                          if (!singleCustomEmailMode) {
                            initializeSingleCustomEmail();
                          }
                          setSingleCustomEmailHtml(html);
                        }}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        The button link will be automatically updated when sending
                      </p>
                    </div>
                  </div>
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
                  This link can only be used once.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setGeneratedLink(null);
                    setLinkCompanyName('');
                    setLinkFirstName('');
                    setLinkFullName('');
                    setLinkEmail('');
                    setLinkSalutation('neutral');
                    setSingleCustomEmailMode(false);
                    setSingleCustomEmailSubject('');
                    setSingleCustomEmailHtml('');
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

      {/* Bulk Magic Link Modal */}
      <Modal
        isOpen={showBulkModal}
        onClose={resetBulkModal}
        title={bulkStepMode ? `Sending ${currentBulkIndex + 1} of ${csvRecipients.length}` : 'Bulk Magic Link Generation'}
        maxWidth={bulkStepMode ? '4xl' : '2xl'}
      >
        <div className="space-y-4">
          {/* Phase 1: CSV Upload */}
          {!bulkStepMode && bulkResults.length === 0 && (
            <>
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  {csvRecipients.length === 0 ? (
                    <div className="text-center">
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="csv-upload-bulk"
                      />
                      <label
                        htmlFor="csv-upload-bulk"
                        className="cursor-pointer inline-flex items-center gap-2 text-fase-navy hover:text-fase-orange"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-sm font-medium">Upload CSV or Excel file</span>
                      </label>
                      <p className="text-xs text-gray-500 mt-2">
                        Required columns: email, company, first name, surname (or full name)
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{csvFileName}</p>
                        <p className="text-xs text-green-600">
                          {csvRecipients.length} recipient{csvRecipients.length !== 1 ? 's' : ''} loaded
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearCsv}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {csvError && (
                    <p className="text-xs text-red-600 mt-2">{csvError}</p>
                  )}
                </div>
              </div>

              {/* Recipients Preview */}
              {csvRecipients.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipients ({csvRecipients.length})
                  </label>
                  <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Company</th>
                          <th className="text-left px-3 py-2 font-medium">Name</th>
                          <th className="text-left px-3 py-2 font-medium">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvRecipients.map((r, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-3 py-2 truncate max-w-[150px]">{r.companyName}</td>
                            <td className="px-3 py-2">
                              <span className="text-gray-900">{r.firstName}</span>
                              <span className="text-gray-400 ml-1">({r.fullName})</span>
                            </td>
                            <td className="px-3 py-2 truncate max-w-[200px]">{r.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={resetBulkModal}
                >
                  Cancel
                </Button>
                <Button
                  onClick={startBulkStepMode}
                  disabled={csvRecipients.length === 0}
                >
                  Start Sending ({csvRecipients.length})
                </Button>
              </div>
            </>
          )}

          {/* Phase 2: Step-through mode - sending one by one */}
          {bulkStepMode && bulkResults.length < csvRecipients.length && (
            <>
              {/* Progress bar */}
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-fase-navy h-2 rounded-full transition-all"
                    style={{ width: `${(bulkResults.length / csvRecipients.length) * 100}%` }}
                  />
                </div>
                <span>{bulkResults.length} / {csvRecipients.length} sent</span>
              </div>

              {/* Current recipient info */}
              {csvRecipients[currentBulkIndex] && (
                <div className="grid grid-cols-2 gap-6">
                  {/* Left: Recipient details */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Company</span>
                          <p className="font-medium text-gray-900">{csvRecipients[currentBulkIndex].companyName}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Email</span>
                          <p className="font-medium text-gray-900">{csvRecipients[currentBulkIndex].email}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">First Name (salutation)</span>
                          <p className="font-medium text-gray-900">{csvRecipients[currentBulkIndex].firstName}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Full Name (form)</span>
                          <p className="font-medium text-gray-900">{csvRecipients[currentBulkIndex].fullName}</p>
                        </div>
                        {csvRecipients[currentBulkIndex].title && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Title</span>
                            <p className="font-medium text-gray-900">{csvRecipients[currentBulkIndex].title}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Language & Salutation Selection */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Language
                          {csvRecipients[currentBulkIndex].suggestedLanguage && (
                            <span className="ml-1 text-xs text-gray-400 font-normal">
                              ({csvRecipients[currentBulkIndex].suggestedLanguage})
                            </span>
                          )}
                        </label>
                        <select
                          value={currentBulkLanguage}
                          onChange={(e) => setCurrentBulkLanguage(e.target.value as SupportedLanguage)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                          disabled={sendingCurrentBulk}
                        >
                          {(Object.keys(LANGUAGE_LABELS) as SupportedLanguage[]).map((lang) => (
                            <option key={lang} value={lang}>
                              {LANGUAGE_LABELS[lang]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Salutation
                        </label>
                        <select
                          value={currentBulkSalutation}
                          onChange={(e) => setCurrentBulkSalutation(e.target.value as SalutationType)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                          disabled={sendingCurrentBulk}
                        >
                          {(Object.keys(SALUTATION_LABELS) as SalutationType[]).map((sal) => (
                            <option key={sal} value={sal}>
                              {SALUTATION_LABELS[sal]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Button
                        variant="secondary"
                        onClick={handleSkipCurrentBulk}
                        disabled={sendingCurrentBulk}
                        className="flex-1"
                      >
                        Skip
                      </Button>
                      <Button
                        onClick={handleSendCurrentBulk}
                        disabled={sendingCurrentBulk}
                        className="flex-1"
                      >
                        {sendingCurrentBulk ? 'Sending...' : 'Send Email'}
                      </Button>
                    </div>
                  </div>

                  {/* Right: Email preview/edit */}
                  <div className="border-l pl-6">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {customEmailMode ? 'Edit Email' : 'Email Preview'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {LANGUAGE_LABELS[currentBulkLanguage]}
                        </span>
                        {!customEmailMode ? (
                          <button
                            type="button"
                            onClick={initializeCustomEmail}
                            className="text-xs text-fase-navy hover:text-fase-orange"
                            disabled={sendingCurrentBulk}
                          >
                            Personalize
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={resetCustomEmail}
                            className="text-xs text-red-600 hover:text-red-800"
                            disabled={sendingCurrentBulk}
                          >
                            Reset to Template
                          </button>
                        )}
                      </div>
                    </div>

                    {customEmailMode ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Subject
                          </label>
                          <input
                            type="text"
                            value={customEmailSubject}
                            onChange={(e) => setCustomEmailSubject(e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-fase-navy focus:border-transparent"
                            disabled={sendingCurrentBulk}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Email Body
                          </label>
                          <RichTextEditor
                            content={customEmailHtml}
                            onChange={setCustomEmailHtml}
                          />
                          <p className="text-xs text-gray-400 mt-1">
                            The button link will be automatically updated when sending
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="border rounded-lg bg-white overflow-auto max-h-[400px]"
                        dangerouslySetInnerHTML={{ __html: currentBulkPreviewHtml }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Quick results summary */}
              {bulkResults.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-500 mb-1">Recent:</p>
                  <div className="flex flex-wrap gap-2">
                    {bulkResults.slice(-5).map((result, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-1 rounded ${
                          result.success
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {result.companyName}: {result.success ? 'Sent' : result.error}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Phase 3: Complete - show results */}
          {bulkResults.length > 0 && bulkResults.length >= csvRecipients.length && (
            <>
              {/* Results */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium text-green-800">Bulk Generation Complete</span>
                </div>
                <p className="text-sm text-green-700">
                  {bulkResults.filter(r => r.success).length} of {bulkResults.length} emails sent successfully.
                </p>
              </div>

              {/* Results List */}
              <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                {bulkResults.map((result, i) => (
                  <div
                    key={i}
                    className={`px-3 py-2 border-b border-gray-100 last:border-b-0 flex items-center justify-between ${
                      result.success ? 'bg-green-50' : result.error === 'Skipped' ? 'bg-gray-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{result.companyName}</span>
                      <span className="text-xs text-gray-500">{result.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.success && (
                        <span className="text-xs text-gray-500">{LANGUAGE_LABELS[result.language]}</span>
                      )}
                      <span className={`text-xs font-medium ${
                        result.success ? 'text-green-600' : result.error === 'Skipped' ? 'text-gray-500' : 'text-red-600'
                      }`}>
                        {result.success ? 'Sent' : result.error || 'Failed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setBulkResults([]);
                    setBulkStepMode(false);
                    clearCsv();
                  }}
                >
                  Generate More
                </Button>
                <Button onClick={resetBulkModal}>
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
