'use client';

import { JoinRequest } from '../../../lib/unified-member';

interface JoinRequestsTabProps {
  pendingJoinRequests: (JoinRequest & { companyData?: any })[];
  loading: boolean;
  onApprove: (companyId: string, requestId: string, requestData: any) => void;
  onReject: (companyId: string, requestId: string, requestData: any) => void;
}

export default function JoinRequestsTab({ 
  pendingJoinRequests, 
  loading, 
  onApprove, 
  onReject 
}: JoinRequestsTabProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
        <p className="text-fase-black">Loading join requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold">
        <div className="p-6 border-b border-fase-light-gold">
          <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">Pending Join Requests</h3>
          <p className="text-fase-black text-sm mt-1">
            Employees requesting access to their company&apos;s FASE membership
          </p>
        </div>
        <div className="divide-y divide-fase-light-gold">
          {pendingJoinRequests.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mb-6">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h4>
                <p className="text-gray-500">All employee join requests have been processed.</p>
              </div>
            </div>
          ) : (
            pendingJoinRequests.map(request => (
              <div key={`${request.companyId}-${request.id}`} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="font-medium text-fase-navy text-lg">{request.fullName}</span>
                      <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {request.jobTitle || 'No title provided'}
                      </span>
                    </div>
                    <div className="text-sm text-fase-black space-y-1">
                      <div><strong>Email:</strong> {request.email}</div>
                      <div><strong>Company:</strong> {request.companyName}</div>
                      <div>
                        <strong>Requested:</strong> {
                          request.requestedAt?.toDate?.()?.toLocaleDateString() || 'Unknown'
                        }
                      </div>
                      {request.companyData && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <h5 className="font-medium text-gray-900 mb-2">Company Information:</h5>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><strong>Status:</strong> {request.companyData.status}</div>
                            <div><strong>Type:</strong> {request.companyData.organizationType}</div>
                            <div><strong>Membership:</strong> {request.companyData.membershipType}</div>
                            {request.companyData.businessAddress && (
                              <div><strong>Location:</strong> {request.companyData.businessAddress.country}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => onApprove(request.companyId, request.id, request)}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => onReject(request.companyId, request.id, request)}
                      className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}