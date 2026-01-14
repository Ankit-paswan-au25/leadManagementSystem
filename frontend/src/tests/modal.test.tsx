import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AppModal from '../components/modal/AppModal';
import ConfirmModal from '../components/modal/ConfirmModal';

describe('Modal Components', () => {
  describe('AppModal', () => {
    it('renders when isOpen is true', () => {
      render(
        <AppModal isOpen={true} onClose={jest.fn()}>
          <div>Modal Content</div>
        </AppModal>
      );
      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <AppModal isOpen={false} onClose={jest.fn()}>
          <div>Modal Content</div>
        </AppModal>
      );
      expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = jest.fn();
      render(
        <AppModal isOpen={true} onClose={onClose}>
          <div>Content</div>
        </AppModal>
      );
      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = jest.fn();
      render(
        <AppModal isOpen={true} onClose={onClose}>
          <div>Content</div>
        </AppModal>
      );
      const backdrop = screen.getByRole('dialog');
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders title when provided', () => {
      render(
        <AppModal isOpen={true} onClose={jest.fn()} title="Test Modal">
          <div>Content</div>
        </AppModal>
      );
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });

    it('does not show close button when showCloseButton is false', () => {
      render(
        <AppModal isOpen={true} onClose={jest.fn()} showCloseButton={false}>
          <div>Content</div>
        </AppModal>
      );
      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
    });
  });

  describe('ConfirmModal', () => {
    it('renders title and message', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onClose={jest.fn()}
          onConfirm={jest.fn()}
          title="Confirm Action"
          message="Are you sure?"
        />
      );
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });

    it('calls onConfirm when confirm button is clicked', () => {
      const onConfirm = jest.fn();
      render(
        <ConfirmModal
          isOpen={true}
          onClose={jest.fn()}
          onConfirm={onConfirm}
          title="Confirm Action"
          message="Are you sure?"
        />
      );
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      fireEvent.click(confirmButton);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when cancel button is clicked', () => {
      const onClose = jest.fn();
      render(
        <ConfirmModal
          isOpen={true}
          onClose={onClose}
          onConfirm={jest.fn()}
          title="Confirm"
          message="Are you sure?"
        />
      );
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('disables buttons when isLoading is true', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onClose={jest.fn()}
          onConfirm={jest.fn()}
          title="Confirm Action"
          message="Are you sure?"
          isLoading={true}
        />
      );
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(confirmButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it('uses custom confirm and cancel text', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onClose={jest.fn()}
          onConfirm={jest.fn()}
          title="Confirm"
          message="Are you sure?"
          confirmText="Yes, delete"
          cancelText="No, keep it"
        />
      );
      expect(screen.getByText('Yes, delete')).toBeInTheDocument();
      expect(screen.getByText('No, keep it')).toBeInTheDocument();
    });
  });
});

