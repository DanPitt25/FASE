'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task, TaskPriority, TaskStatus } from '../../../lib/firestore';
import { authFetch, authPost, authDelete } from '@/lib/auth-fetch';

interface EmailImportStatus {
  configured: boolean;
  unprocessedCount?: number;
  emails?: Array<{ from: string; subject: string; date: string }>;
  error?: string;
}

interface EmailImportResult {
  success: boolean;
  totalEmails?: number;
  tasksCreated?: number;
  skipped?: number;
  duplicates?: number;
  tasks?: Array<{ title: string; priority: string; from: string }>;
  errors?: Array<{ email: string; error: string }>;
  error?: string;
  classification?: any;
  email?: { from: string; subject: string; date: string };
  message?: string;
}

export default function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  // New task form
  const [showForm, setShowForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    dueDate: '',
  });
  const [saving, setSaving] = useState(false);

  // Email import state
  const [showEmailImport, setShowEmailImport] = useState(false);
  const [importStatus, setImportStatus] = useState<EmailImportStatus | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<EmailImportResult | null>(null);
  const [importHours, setImportHours] = useState(24); // Default to last 24 hours

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/admin/tasks');
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;

    setSaving(true);
    try {
      const response = await authPost('/api/admin/tasks', {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        dueDate: newTask.dueDate || null,
        createdBy: 'admin',
        createdByName: 'Admin',
      });

      const data = await response.json();
      if (data.success) {
        setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' });
        setShowForm(false);
        await loadTasks();
      }
    } catch (err) {
      console.error('Failed to add task:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, status: TaskStatus) => {
    try {
      await authFetch('/api/admin/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          status,
          performedBy: 'admin',
          performedByName: 'Admin',
        }),
      });
      await loadTasks();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;

    try {
      await authDelete(`/api/admin/tasks?task_id=${taskId}`);
      await loadTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Email import functions
  const checkEmailStatus = async () => {
    setImportLoading(true);
    setImportResult(null);
    try {
      const response = await authPost('/api/admin/email-import', { action: 'status', hoursBack: importHours });
      const data = await response.json();
      if (data.success) {
        setImportStatus({
          configured: true,
          unprocessedCount: data.unprocessedCount,
          emails: data.emails
        });
      } else {
        setImportStatus({
          configured: data.error !== 'Email import not configured',
          error: data.error || data.details
        });
      }
    } catch (err: any) {
      setImportStatus({ configured: false, error: err.message });
    } finally {
      setImportLoading(false);
    }
  };

  const testEmailClassification = async () => {
    setImportLoading(true);
    setImportResult(null);
    try {
      const response = await authPost('/api/admin/email-import', { action: 'test', hoursBack: importHours });
      const data = await response.json();
      setImportResult(data);
    } catch (err: any) {
      setImportResult({ success: false, error: err.message });
    } finally {
      setImportLoading(false);
    }
  };

  const runEmailImport = async () => {
    const timeDesc = importHours === 24 ? 'last 24 hours' : importHours === 48 ? 'last 2 days' : importHours === 168 ? 'last week' : `last ${importHours} hours`;
    if (!confirm(`This will process unprocessed emails from the ${timeDesc} and create tasks. Continue?`)) return;

    setImportLoading(true);
    setImportResult(null);
    try {
      const response = await authPost('/api/admin/email-import', { action: 'process', hoursBack: importHours });
      const data = await response.json();
      setImportResult(data);
      if (data.success && data.tasksCreated > 0) {
        await loadTasks(); // Refresh task list
      }
    } catch (err: any) {
      setImportResult({ success: false, error: err.message });
    } finally {
      setImportLoading(false);
    }
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return null;
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isOverdue = (dueDate: any) => {
    if (!dueDate) return false;
    const date = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    return date < new Date();
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'pending') return task.status !== 'completed';
    if (filter === 'completed') return task.status === 'completed';
    return true;
  });

  const pendingCount = tasks.filter((t) => t.status !== 'completed').length;
  const overdueCount = tasks.filter(
    (t) => t.status !== 'completed' && isOverdue(t.dueDate)
  ).length;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
        <p className="text-gray-600">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">
              Admin Tasks
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {pendingCount} pending{overdueCount > 0 && <span className="text-red-600 font-medium"> ({overdueCount} overdue)</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'pending' | 'completed')}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            >
              <option value="pending">Pending ({pendingCount})</option>
              <option value="completed">Completed ({tasks.length - pendingCount})</option>
              <option value="all">All ({tasks.length})</option>
            </select>
            <button
              onClick={() => setShowEmailImport(!showEmailImport)}
              className="px-4 py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Import
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-fase-navy text-white rounded-lg hover:bg-opacity-90 text-sm font-medium"
            >
              + Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Add Task Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
          <h4 className="font-medium text-fase-navy mb-4">New Task</h4>
          <div className="space-y-4">
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="Task title..."
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            />
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Description (optional)"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-fase-navy focus:border-transparent resize-none"
              rows={2}
            />
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">Due Date</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                disabled={!newTask.title.trim() || saving}
                className="px-4 py-2 bg-fase-navy text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Import Panel */}
      {showEmailImport && (
        <div className="bg-white rounded-lg shadow-lg border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-fase-navy flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email → Task Import
            </h4>
            <button
              onClick={() => setShowEmailImport(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status Section */}
          {importLoading && (
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-fase-navy"></div>
              <span className="text-sm">Processing...</span>
            </div>
          )}

          {importStatus && !importLoading && (
            <div className="mb-4">
              {importStatus.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{importStatus.error}</p>
                  {!importStatus.configured && (
                    <p className="text-xs text-red-600 mt-1">
                      Set GMAIL_IMPORT_WEBHOOK_URL and GMAIL_IMPORT_WEBHOOK_SECRET in Vercel env vars.
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">{importStatus.unprocessedCount}</span> unprocessed email{importStatus.unprocessedCount !== 1 ? 's' : ''} found
                  </p>
                  {importStatus.emails && importStatus.emails.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {importStatus.emails.map((email, i) => (
                        <div key={i} className="text-xs text-blue-700 truncate">
                          <span className="font-medium">{email.from.replace(/<.*>/, '').trim()}</span>
                          {' — '}{email.subject}
                        </div>
                      ))}
                      {(importStatus.unprocessedCount || 0) > 5 && (
                        <p className="text-xs text-blue-600">...and {(importStatus.unprocessedCount || 0) - 5} more</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Result Section */}
          {importResult && (
            <div className={`mb-4 rounded-lg p-3 ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {importResult.error ? (
                <p className="text-sm text-red-700">{importResult.error}</p>
              ) : importResult.message ? (
                <p className="text-sm text-green-700">{importResult.message}</p>
              ) : importResult.classification ? (
                // Test result
                <div>
                  <p className="text-sm font-medium text-green-800 mb-2">Test Classification Result:</p>
                  <div className="text-xs space-y-1 text-green-700">
                    <p><span className="font-medium">Email:</span> {importResult.email?.subject}</p>
                    <p><span className="font-medium">Is Action Item:</span> {importResult.classification.isActionItem ? 'Yes' : 'No'}</p>
                    {importResult.classification.isActionItem && (
                      <>
                        <p><span className="font-medium">Task Title:</span> {importResult.classification.taskTitle}</p>
                        <p><span className="font-medium">Priority:</span> {importResult.classification.priority}</p>
                      </>
                    )}
                    <p><span className="font-medium">Reasoning:</span> {importResult.classification.reasoning}</p>
                  </div>
                </div>
              ) : (
                // Process result
                <div>
                  <p className="text-sm font-medium text-green-800 mb-2">Import Complete</p>
                  <div className="text-xs space-y-1 text-green-700">
                    <p>Processed {importResult.totalEmails} emails</p>
                    <p className="font-medium">{importResult.tasksCreated} task{importResult.tasksCreated !== 1 ? 's' : ''} created</p>
                    <p>{importResult.skipped} skipped (not action items)</p>
                    {(importResult.duplicates || 0) > 0 && (
                      <p className="text-yellow-700">{importResult.duplicates} already had tasks (skipped duplicates)</p>
                    )}
                  </div>
                  {importResult.tasks && importResult.tasks.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-green-200">
                      <p className="text-xs font-medium text-green-800 mb-1">Created Tasks:</p>
                      {importResult.tasks.map((task, i) => (
                        <div key={i} className="text-xs text-green-700">• {task.title}</div>
                      ))}
                    </div>
                  )}
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-red-200">
                      <p className="text-xs font-medium text-red-700 mb-1">Errors:</p>
                      {importResult.errors.map((err, i) => (
                        <div key={i} className="text-xs text-red-600">• {err.email}: {err.error}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Time Range + Action Buttons */}
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={importHours}
              onChange={(e) => {
                setImportHours(Number(e.target.value));
                setImportStatus(null); // Reset status when changing time range
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={6}>Last 6 hours</option>
              <option value={12}>Last 12 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={48}>Last 2 days</option>
              <option value={168}>Last week</option>
            </select>
            <button
              onClick={checkEmailStatus}
              disabled={importLoading}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Check Emails
            </button>
            <button
              onClick={testEmailClassification}
              disabled={importLoading || !importStatus?.configured || (importStatus?.unprocessedCount || 0) === 0}
              className="px-3 py-2 text-sm border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
            >
              Test First
            </button>
            <button
              onClick={runEmailImport}
              disabled={importLoading || !importStatus?.configured || (importStatus?.unprocessedCount || 0) === 0}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Import All
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Uses Gemini AI to classify emails as action items and creates tasks automatically.
          </p>
        </div>
      )}

      {/* Tasks List */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {filter === 'pending' ? 'No pending tasks' : filter === 'completed' ? 'No completed tasks' : 'No tasks yet'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 hover:bg-gray-50 ${
                  task.status === 'completed' ? 'bg-gray-50 opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() =>
                      handleUpdateStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')
                    }
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-fase-navy focus:ring-fase-navy"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-medium ${
                          task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
                        }`}
                      >
                        {task.title}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          task.priority === 'high'
                            ? 'bg-red-100 text-red-700'
                            : task.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {task.priority}
                      </span>
                      {task.dueDate && task.status !== 'completed' && (
                        <span
                          className={`text-xs ${
                            isOverdue(task.dueDate) ? 'text-red-600 font-medium' : 'text-gray-500'
                          }`}
                        >
                          Due: {formatDate(task.dueDate)}
                          {isOverdue(task.dueDate) && ' (overdue)'}
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    )}
                    {task.source === 'email' && task.sourceEmail && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs text-blue-600 truncate">
                          {task.sourceEmail.replace(/<.*>/, '').trim()}
                          {task.sourceSubject && ` — "${task.sourceSubject}"`}
                        </span>
                      </div>
                    )}
                    {task.accountId && (
                      <p className="text-xs text-gray-400 mt-1">
                        Linked to account
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
