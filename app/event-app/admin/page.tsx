'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUnifiedAuth } from '../../../contexts/UnifiedAuthContext';

interface Stats {
  totalRegistrations: number;
  totalAttendees: number;
  checkedIn: number;
  pendingPayment: number;
  revenue: number;
}

interface Task {
  id: string;
  title: string;
  assignee: 'Daniel' | 'William' | 'Aline' | 'Unassigned';
  status: 'todo' | 'in_progress' | 'done';
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
}

const teamMembers = ['Daniel', 'William', 'Aline'] as const;

export default function AdminPage() {
  const { user, isAdmin, loading } = useUnifiedAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/event-app');
    }
  }, [loading, isAdmin, router]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/event-app/admin/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    const fetchTasks = async () => {
      try {
        const response = await fetch('/api/event-app/admin/tasks?limit=3');
        if (response.ok) {
          const data = await response.json();
          setRecentTasks(data);
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      }
    };

    if (isAdmin) {
      fetchStats();
      fetchTasks();
    }
  }, [isAdmin]);

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
      <div className="bg-fase-navy text-white px-4 py-6">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <p className="text-white/70 text-sm">MGA Rendezvous 2026</p>
      </div>

      {/* Quick Actions */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/event-app/admin/checkin"
            className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center gap-2"
          >
            <span className="text-3xl">📱</span>
            <span className="font-medium text-gray-900">Check-In</span>
            <span className="text-xs text-gray-500">Scan QR codes</span>
          </Link>
          <Link
            href="/event-app/admin/tasks"
            className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center gap-2"
          >
            <span className="text-3xl">✅</span>
            <span className="font-medium text-gray-900">Tasks</span>
            <span className="text-xs text-gray-500">Team to-dos</span>
          </Link>
          <Link
            href="/event-app/admin/dashboard"
            className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center gap-2"
          >
            <span className="text-3xl">📊</span>
            <span className="font-medium text-gray-900">Dashboard</span>
            <span className="text-xs text-gray-500">Full stats</span>
          </Link>
          <Link
            href="/event-app/notifications"
            className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center gap-2"
          >
            <span className="text-3xl">📢</span>
            <span className="font-medium text-gray-900">Broadcast</span>
            <span className="text-xs text-gray-500">Send alerts</span>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Quick Stats
        </h2>
        {loadingStats ? (
          <div className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        ) : stats ? (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-fase-navy">{stats.totalAttendees}</div>
                <div className="text-xs text-gray-500">Attendees</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.checkedIn}</div>
                <div className="text-xs text-gray-500">Checked In</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.totalAttendees > 0
                    ? Math.round((stats.checkedIn / stats.totalAttendees) * 100)
                    : 0}%
                </div>
                <div className="text-xs text-gray-500">Attendance</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Revenue</span>
                <span className="font-semibold text-gray-900">
                  €{stats.revenue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-4 text-center text-gray-500">
            Unable to load stats
          </div>
        )}
      </div>

      {/* Recent Tasks */}
      <div className="px-4 mt-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Recent Tasks
          </h2>
          <Link href="/event-app/admin/tasks" className="text-sm text-fase-navy font-medium">
            View All
          </Link>
        </div>
        <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
          {recentTasks.length > 0 ? (
            recentTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              No tasks yet
            </div>
          )}
        </div>
      </div>

      {/* Team Status */}
      <div className="px-4 mt-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Team
        </h2>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex justify-around">
            {teamMembers.map((member) => (
              <div key={member} className="text-center">
                <div className="w-12 h-12 bg-fase-navy/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-fase-navy font-medium">{member[0]}</span>
                </div>
                <div className="text-sm font-medium text-gray-900">{member}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const priorityColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-gray-100 text-gray-600',
  };

  const statusIcons = {
    todo: '⬜',
    in_progress: '🔄',
    done: '✅',
  };

  return (
    <div className="p-4 flex items-center gap-3">
      <span className="text-lg">{statusIcons[task.status]}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          {task.title}
        </p>
        <p className="text-xs text-gray-500">{task.assignee}</p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[task.priority]}`}>
        {task.priority}
      </span>
    </div>
  );
}
