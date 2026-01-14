import React from 'react';
import { render, screen } from '@testing-library/react';
import SuccessAlert from '../components/alerts/SuccessAlert';
import InfoAlert from '../components/alerts/InfoAlert';
import ErrorAlert from '../components/alerts/ErrorAlert';

describe('Alert Components', () => {
  describe('SuccessAlert', () => {
    it('renders success message', () => {
      render(<SuccessAlert message="Operation successful!" />);
      expect(screen.getByText('Operation successful!')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = jest.fn();
      render(<SuccessAlert message="Success!" onClose={onClose} />);
      const closeButton = screen.getByLabelText('Close');
      closeButton.click();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not show close button when onClose is not provided', () => {
      render(<SuccessAlert message="Success!" />);
      expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
    });
  });

  describe('InfoAlert', () => {
    it('renders info message', () => {
      render(<InfoAlert message="This is an info message" />);
      expect(screen.getByText('This is an info message')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = jest.fn();
      render(<InfoAlert message="Info!" onClose={onClose} />);
      const closeButton = screen.getByLabelText('Close');
      closeButton.click();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('ErrorAlert', () => {
    it('renders error message', () => {
      render(<ErrorAlert message="An error occurred" />);
      expect(screen.getByText('An error occurred')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = jest.fn();
      render(<ErrorAlert message="Error!" onClose={onClose} />);
      const closeButton = screen.getByLabelText('Close');
      closeButton.click();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('has correct ARIA role', () => {
      render(<ErrorAlert message="Error message" />);
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });
  });
});

