import React, { useState, useEffect } from 'react';
import { ownershipService } from '../../services/ownership.service';
import type { OwnershipRequest } from '../../types/ownership.types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Skeleton from '../../components/ui/Skeleton';
import ErrorAlert from '../../components/alerts/ErrorAlert';
import SuccessAlert from '../../components/alerts/SuccessAlert';
import Button from '../../components/ui/Button';
import ApproveOwnershipModal from '../../components/Leads/ApproveOwnershipModal';
import RejectOwnershipModal from '../../components/Leads/RejectOwnershipModal';

const OwnershipRequests: React.FC = () => {
  const [requests, setRequests] = useState<OwnershipRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<OwnershipRequest | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    setError(null);

    ownershipService
      .getPendingRequests()
      .then((data) => {
        setRequests(data);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load ownership requests';
        setError(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleApproveSuccess = () => {
    setSuccessMessage('Ownership request approved successfully');
    setApproveModalOpen(false);
    setSelectedRequest(null);
    // Reload to get fresh data
    loadRequests();
    // Clear success message after 3 seconds
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleRejectSuccess = () => {
    setSuccessMessage('Ownership request rejected successfully');
    setRejectModalOpen(false);
    setSelectedRequest(null);
    // Reload to get fresh data
    loadRequests();
    // Clear success message after 3 seconds
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns: Array<{
    key: string;
    header: string;
    render?: (request: OwnershipRequest) => React.ReactNode;
  }> = [
    {
      key: 'leadName',
      header: 'Lead Name',
      render: (request: OwnershipRequest) => (
        <div className="font-medium text-text-primary">{request.leadName}</div>
      ),
    },
    {
      key: 'currentOwnerName',
      header: 'Current Owner',
      render: (request: OwnershipRequest) => (
        <div className="text-text-secondary">{request.currentOwnerName}</div>
      ),
    },
    {
      key: 'requestedOwnerName',
      header: 'Requested Owner',
      render: (request: OwnershipRequest) => (
        <div className="text-text-secondary">{request.requestedOwnerName}</div>
      ),
    },
    {
      key: 'requestedByName',
      header: 'Requested By',
      render: (request: OwnershipRequest) => (
        <div className="text-text-secondary">{request.requestedByName}</div>
      ),
    },
    {
      key: 'requestedAt',
      header: 'Requested At',
      render: (request: OwnershipRequest) => (
        <div className="text-text-secondary">{formatDate(request.requestedAt)}</div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (request: OwnershipRequest) => (
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSelectedRequest(request);
              setApproveModalOpen(true);
            }}
          >
            Approve
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setSelectedRequest(request);
              setRejectModalOpen(true);
            }}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ErrorAlert message={error} onClose={() => setError(null)} />
        <Card>
          <Button onClick={loadRequests} variant="primary">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Ownership Requests</h1>
        <p className="text-text-secondary mt-1">
          {requests.length} {requests.length === 1 ? 'pending request' : 'pending requests'}
        </p>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <SuccessAlert message={successMessage} onClose={() => setSuccessMessage(null)} />
      )}

      {/* Table */}
      <Card>
        {requests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary mb-4">No pending ownership requests</p>
          </div>
        ) : (
          <Table data={requests} columns={columns} />
        )}
      </Card>

      {/* Approve Modal */}
      {selectedRequest && approveModalOpen && (
        <ApproveOwnershipModal
          isOpen={approveModalOpen}
          onClose={() => {
            setApproveModalOpen(false);
            setSelectedRequest(null);
          }}
          leadId={selectedRequest.leadId}
          leadName={selectedRequest.leadName}
          onSuccess={handleApproveSuccess}
        />
      )}

      {/* Reject Modal */}
      {selectedRequest && rejectModalOpen && (
        <RejectOwnershipModal
          isOpen={rejectModalOpen}
          onClose={() => {
            setRejectModalOpen(false);
            setSelectedRequest(null);
          }}
          leadId={selectedRequest.leadId}
          leadName={selectedRequest.leadName}
          onSuccess={handleRejectSuccess}
        />
      )}
    </div>
  );
};

export default OwnershipRequests;
