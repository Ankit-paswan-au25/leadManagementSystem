import React, { useState } from 'react';
import { ownershipService } from '../../services/ownership.service';
import ConfirmModal from '../modal/ConfirmModal';
import ErrorAlert from '../alerts/ErrorAlert';

interface ApproveOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  onSuccess?: () => void;
}

const ApproveOwnershipModal: React.FC<ApproveOwnershipModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadName,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setError(null);
    setIsLoading(true);

    ownershipService
      .approveRequest(leadId)
      .then(() => {
        onSuccess?.();
        onClose();
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to approve ownership request';
        setError(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleApprove}
      title="Approve Ownership Change"
      message={`Are you sure you want to approve the ownership change request for "${leadName}"?`}
      confirmText="Approve"
      cancelText="Cancel"
      variant="info"
      isLoading={isLoading}
      disabled={isLoading}
    >
      {error && (
        <div className="mt-4">
          <ErrorAlert message={error} onClose={() => setError(null)} />
        </div>
      )}
    </ConfirmModal>
  );
};

export default ApproveOwnershipModal;
