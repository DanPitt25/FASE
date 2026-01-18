'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUnifiedAuth } from '../../../../contexts/UnifiedAuthContext';

interface Task {
  id: string;
  title: string;
  description?: string;
  assignee: 'Daniel' | 'William' | 'Aline' | 'Unassigned';
  status: 'todo' | 'in_progress' | 'done';
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  createdAt: string;
  createdBy: string;
}

const teamMembers = ['Daniel', 'William', 'Aline', 'Unassigned'] as const;

const priorityConfig = {
  high: { label: 'High', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
};

const statusConfig = {
  todo: { label: 'To Do', icon: '⬜' },
  in_progress: { label: 'In Progress', icon: '🔄' },
  done: { label: 'Done', icon: '✅' },
};

export default function TasksPage() {
  const { isAdmin, loading, member } = useUnifiedAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine' | 'unassigned'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Determine current user's team name (simplified - you'd map email to name)
  const currentUserName = member?.firstName || 'Daniel';

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/event-app');
    }
  }, [loading, isAdmin, router]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/event-app/admin/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await fetch('/api/event-app/admin/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
    } catch (error) {
      console.error('Failed to update task:', error);
      fetchTasks(); // Revert on error
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;

    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      await fetch('/api/event-app/admin/tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId }),
      });
    } catch (error) {
      console.error('Failed to delete task:', error);
      fetchTasks();
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'mine') return task.assignee === currentUserName;
    if (filter === 'unassigned') return task.assignee === 'Unassigned';
    return true;
  });

  // Group by status
  const todoTasks = filteredTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress');
  const doneTasks = filteredTasks.filter((t) => t.status === 'done');

  if (loading || !isAdmin) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-fase-navy text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">Team Tasks</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex gap-2">
          <FilterButton
            label="All"
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            count={tasks.length}
          />
          <FilterButton
            label="My Tasks"
            active={filter === 'mine'}
            onClick={() => setFilter('mine')}
            count={tasks.filter((t) => t.assignee === currentUserName).length}
          />
          <FilterButton
            label="Unassigned"
            active={filter === 'unassigned'}
            onClick={() => setFilter('unassigned')}
            count={tasks.filter((t) => t.assignee === 'Unassigned').length}
          />
        </div>
      </div>

      {/* Task Lists */}
      <div className="px-4 py-4 space-y-6">
        {loadingTasks ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy"></div>
          </div>
        ) : (
          <>
            {/* To Do */}
            <TaskSection
              title="To Do"
              icon="⬜"
              tasks={todoTasks}
              onStatusChange={updateTaskStatus}
              onEdit={setEditingTask}
              onDelete={deleteTask}
            />

            {/* In Progress */}
            <TaskSection
              title="In Progress"
              icon="🔄"
              tasks={inProgressTasks}
              onStatusChange={updateTaskStatus}
              onEdit={setEditingTask}
              onDelete={deleteTask}
            />

            {/* Done */}
            <TaskSection
              title="Done"
              icon="✅"
              tasks={doneTasks}
              onStatusChange={updateTaskStatus}
              onEdit={setEditingTask}
              onDelete={deleteTask}
              collapsed
            />
          </>
        )}
      </div>

      {/* Add/Edit Task Modal */}
      {(showAddModal || editingTask) && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setShowAddModal(false);
            setEditingTask(null);
          }}
          onSave={() => {
            fetchTasks();
            setShowAddModal(false);
            setEditingTask(null);
          }}
          currentUser={currentUserName}
        />
      )}
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
        active
          ? 'bg-fase-navy text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
      <span className={`text-xs ${active ? 'bg-white/20' : 'bg-gray-200'} px-1.5 py-0.5 rounded-full`}>
        {count}
      </span>
    </button>
  );
}

function TaskSection({
  title,
  icon,
  tasks,
  onStatusChange,
  onEdit,
  onDelete,
  collapsed = false,
}: {
  title: string;
  icon: string;
  tasks: Task[];
  onStatusChange: (id: string, status: Task['status']) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  collapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  if (tasks.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 mb-2 w-full"
      >
        <span>{icon}</span>
        <span className="font-semibold text-gray-900">{title}</span>
        <span className="text-sm text-gray-500">({tasks.length})</span>
        <svg
          className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${
            isCollapsed ? '' : 'rotate-180'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!isCollapsed && (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  task: Task;
  onStatusChange: (id: string, status: Task['status']) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const priority = priorityConfig[task.priority];

  const nextStatus = (): Task['status'] => {
    if (task.status === 'todo') return 'in_progress';
    if (task.status === 'in_progress') return 'done';
    return 'todo';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onStatusChange(task.id, nextStatus())}
          className="mt-0.5 text-lg"
        >
          {statusConfig[task.status].icon}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`font-medium ${
                task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'
              }`}
            >
              {task.title}
            </p>
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>
          {task.description && (
            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full ${priority.color}`}>
              {priority.label}
            </span>
            <span className="text-xs text-gray-500">
              {task.assignee}
            </span>
            {task.dueDate && (
              <span className="text-xs text-gray-400">
                Due: {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Menu */}
      {showActions && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
          <button
            onClick={() => {
              onEdit(task);
              setShowActions(false);
            }}
            className="flex-1 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Edit
          </button>
          <button
            onClick={() => {
              onDelete(task.id);
              setShowActions(false);
            }}
            className="flex-1 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function TaskModal({
  task,
  onClose,
  onSave,
  currentUser,
}: {
  task: Task | null;
  onClose: () => void;
  onSave: () => void;
  currentUser: string;
}) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [assignee, setAssignee] = useState<Task['assignee']>(task?.assignee || 'Unassigned');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'medium');
  const [dueDate, setDueDate] = useState(task?.dueDate || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;

    setSaving(true);
    try {
      const method = task ? 'PATCH' : 'POST';
      const body = task
        ? { id: task.id, title, description, assignee, priority, dueDate }
        : { title, description, assignee, priority, dueDate, createdBy: currentUser };

      await fetch('/api/event-app/admin/tasks', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      onSave();
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>

        <div className="px-6 pb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {task ? 'Edit Task' : 'New Task'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy/20 focus:border-fase-navy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy/20 focus:border-fase-navy resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assignee
                </label>
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value as Task['assignee'])}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy/20 focus:border-fase-navy bg-white"
                >
                  {teamMembers.map((member) => (
                    <option key={member} value={member}>
                      {member}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Task['priority'])}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy/20 focus:border-fase-navy bg-white"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy/20 focus:border-fase-navy"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || saving}
              className="flex-1 py-3 bg-fase-navy text-white rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : task ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
