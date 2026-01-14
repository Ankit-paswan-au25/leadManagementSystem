import React from 'react';
import AppModal from './AppModal';
import Button from '../ui/Button';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  const variantClasses = {
    danger: 'text-error-600',
    warning: 'text-warning-600',
    info: 'text-info-600',
  };

  const confirmButtonVariant = variant === 'danger' ? 'primary' : 'primary';

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      showCloseButton={!isLoading}
    >
      <div className="space-y-4">
        <p className={`text-base ${variantClasses[variant]}`}>{message}</p>
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmButtonVariant}
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </AppModal>
  );
};

export default ConfirmModal;

