'use client';

import { useState, useEffect } from 'react';
import { AuditLogger, ActionRecord } from '../../../lib/audit-logger';
import Button from '../../../components/Button';

export default function AuditLogTab() {
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<{
    category: ActionRecord['category'] | 'all';
    memberSearch: string;
    adminSearch: string;
  }>({
    category: 'all',
    memberSearch: '',
    adminSearch: ''
  });

  useEffect(() => {
    loadActions();
  }, []);

  const loadActions = async (append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setActions([]);
    }
    
    try {
      const currentOffset = append ? actions.length : 0;
      const limitCount = 50;
      const recentActions = await AuditLogger.getRecentActions(limitCount, currentOffset);
      
      if (append) {
        setActions(prev => [...prev, ...recentActions]);
      } else {
        setActions(recentActions);
      }
      
      // If we got fewer results than requested, we've reached the end
      setHasMore(recentActions.length === limitCount);
    } catch (error) {
      console.error('Failed to load audit actions:', error);
    }
    
    if (append) {
      setLoadingMore(false);
    } else {
      setLoading(false);
    }
  };

  const loadActionsByCategory = async (category: ActionRecord['category']) => {
    setLoading(true);
    setActions([]);
    try {
      const categoryActions = await AuditLogger.getActionsByCategory(category, 100);
      setActions(categoryActions);
      setHasMore(false); // Category filtering doesn't support pagination for now
    } catch (error) {
      console.error('Failed to load actions by category:', error);
    }
    setLoading(false);
  };

  const handleCategoryFilter = (category: ActionRecord['category'] | 'all') => {
    setFilter(prev => ({ ...prev, category }));
    if (category === 'all') {
      loadActions();
    } else {
      loadActionsByCategory(category);
    }
  };

  const filteredActions = actions.filter(action => {
    const matchesAdmin = !filter.adminSearch || 
      action.adminUserEmail?.toLowerCase().includes(filter.adminSearch.toLowerCase()) ||
      action.adminUserId.includes(filter.adminSearch);
    
    const matchesMember = !filter.memberSearch ||
      action.memberEmail?.toLowerCase().includes(filter.memberSearch.toLowerCase()) ||
      action.organizationName?.toLowerCase().includes(filter.memberSearch.toLowerCase()) ||
      action.memberAccountId?.includes(filter.memberSearch);

    return matchesAdmin && matchesMember;
  });

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const getActionColor = (action: ActionRecord) => {
    if (!action.success) return 'bg-red-50 border-red-200';
    
    switch (action.category) {
      case 'member': return 'bg-blue-50 border-blue-200';
      case 'email': return 'bg-green-50 border-green-200';
      case 'payment': return 'bg-yellow-50 border-yellow-200';
      case 'invoice': return 'bg-orange-50 border-orange-200';
      case 'system': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getCategoryBadgeColor = (category: ActionRecord['category']) => {
    switch (category) {
      case 'member': return 'bg-blue-100 text-blue-800';
      case 'email': return 'bg-green-100 text-green-800';
      case 'payment': return 'bg-yellow-100 text-yellow-800';
      case 'invoice': return 'bg-orange-100 text-orange-800';
      case 'system': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
        <p className="text-fase-black">Loading audit logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-fase-navy">Audit Log</h2>
        <Button variant="secondary" onClick={loadActions}>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-fase-navy mb-4">Filters</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={filter.category}
              onChange={(e) => handleCategoryFilter(e.target.value as ActionRecord['category'] | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="member">Member</option>
              <option value="email">Email</option>
              <option value="payment">Payment</option>
              <option value="invoice">Invoice</option>
              <option value="system">System</option>
            </select>
          </div>

          {/* Admin Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin User
            </label>
            <input
              type="text"
              value={filter.adminSearch}
              onChange={(e) => setFilter(prev => ({ ...prev, adminSearch: e.target.value }))}
              placeholder="Search admin email or ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            />
          </div>

          {/* Member Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Member/Organization
            </label>
            <input
              type="text"
              value={filter.memberSearch}
              onChange={(e) => setFilter(prev => ({ ...prev, memberSearch: e.target.value }))}
              placeholder="Search member email or organization..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Actions List */}
      <div className="space-y-3">
        {filteredActions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No audit actions found matching your filters.
          </div>
        ) : (
          filteredActions.map((action) => (
            <div
              key={action.id}
              className={`p-4 rounded-lg border ${getActionColor(action)}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryBadgeColor(action.category)}`}>
                    {action.category.replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${action.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {action.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {formatTimestamp(action.timestamp)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Action:</span>
                  <p className="text-fase-black">{action.action}</p>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Admin:</span>
                  <p className="text-fase-black">{action.adminUserEmail || action.adminUserId}</p>
                </div>
                
                {action.organizationName && (
                  <div>
                    <span className="font-medium text-gray-700">Organization:</span>
                    <p className="text-fase-black">{action.organizationName}</p>
                  </div>
                )}
              </div>

              {/* Details */}
              {Object.keys(action.details).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="font-medium text-gray-700">Details:</span>
                  <div className="mt-1 space-y-1">
                    {Object.entries(action.details).map(([key, value]) => (
                      value && (
                        <CollapsibleField key={key} label={key} value={value} />
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {action.errorMessage && (
                <div className="mt-3 pt-3 border-t border-red-200">
                  <span className="font-medium text-red-700">Error:</span>
                  <p className="text-red-600 text-sm">{action.errorMessage}</p>
                </div>
              )}
            </div>
          ))
        )}
        
        {/* Load More Button */}
        {!loading && hasMore && filter.category === 'all' && (
          <div className="text-center py-4">
            <Button 
              variant="secondary" 
              onClick={() => loadActions(true)}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Component to display collapsible fields with better object formatting
function CollapsibleField({ label, value }: { label: string; value: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatValue = (val: any): string => {
    if (val === null || val === undefined) return 'N/A';
    if (typeof val === 'object') {
      return JSON.stringify(val, null, 2);
    }
    return String(val);
  };
  
  const formattedValue = formatValue(value);
  const isLongValue = formattedValue.length > 100 || formattedValue.includes('\n');
  
  return (
    <div className="border-l-2 border-gray-200 pl-3 my-1">
      <div className="flex items-center justify-between">
        <span className="text-gray-600 text-xs uppercase font-medium">{label}:</span>
        {isLongValue && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 hover:text-blue-800 text-xs ml-2"
          >
            {isExpanded ? '▼ Collapse' : '▶ Expand'}
          </button>
        )}
      </div>
      
      {isLongValue ? (
        <div className={`mt-1 ${isExpanded ? 'block' : 'hidden'}`}>
          <pre className="text-xs bg-gray-50 p-2 rounded border overflow-x-auto whitespace-pre-wrap">
            {formattedValue}
          </pre>
        </div>
      ) : (
        <div className="mt-1">
          <span className="text-fase-black text-sm">{formattedValue}</span>
        </div>
      )}
      
      {isLongValue && !isExpanded && (
        <div className="mt-1">
          <span className="text-gray-500 text-xs">
            {formattedValue.substring(0, 100)}...
          </span>
        </div>
      )}
    </div>
  );
}