import React, { useState } from 'react';
import { ownershipService } from '../../services/ownership.service';
import AppModal from '../modal/AppModal';
import Button from '../ui/Button';
import ErrorAlert from '../alerts/ErrorAlert';

interface RejectOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  onSuccess?: () => void;
}

const RejectOwnershipModal: React.FC<RejectOwnershipModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadName,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    ownershipService
      .rejectRequest(leadId, reason.trim() || undefined)
      .then(() => {
        onSuccess?.();
        onClose();
        setReason('');
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to reject ownership request';
        setError(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <AppModal isOpen={isOpen} onClose={onClose} title="Reject Ownership Change">
      <form onSubmit={handleReject} className="space-y-4">
        <div>
          <p className="text-text-secondary mb-4">
            Rejecting ownership change request for: <strong>{leadName}</strong>
          </p>
        </div>

        {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-text-primary mb-1">
            Reason (Optional)
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary"
            placeholder="Optional reason for rejection..."
            disabled={isLoading}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" isLoading={isLoading} disabled={isLoading}>
            Reject Request
          </Button>
        </div>
      </form>
    </AppModal>
  );
};

export default RejectOwnershipModal;
