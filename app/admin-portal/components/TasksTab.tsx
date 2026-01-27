'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task, TaskPriority, TaskStatus } from '../../../lib/firestore';

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

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/tasks');
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
      const response = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          priority: newTask.priority,
          dueDate: newTask.dueDate || null,
          createdBy: 'admin',
          createdByName: 'Admin',
        }),
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
      await fetch('/api/admin/tasks', {
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
      await fetch(`/api/admin/tasks?task_id=${taskId}`, {
        method: 'DELETE',
      });
      await loadTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
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
