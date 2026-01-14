import React from 'react';

export interface SuccessAlertProps {
  message: string;
  onClose?: () => void;
  className?: string;
}

const SuccessAlert: React.FC<SuccessAlertProps> = ({
  message,
  onClose,
  className = '',
}) => {
  return (
    <div
      className={`flex items-center p-4 mb-4 text-sm text-success-800 bg-success-50 border border-success-200 rounded-lg dark:bg-success-900/20 dark:text-success-400 dark:border-success-800 ${className}`}
      role="alert"
    >
      <svg
        className="flex-shrink-0 w-5 h-5 mr-3"
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          type="button"
          className="ml-auto -mx-1.5 -my-1.5 text-success-500 hover:text-success-600 rounded-lg focus:ring-2 focus:ring-success-400 p-1.5 inline-flex h-6 w-6 dark:hover:text-success-300"
          onClick={onClose}
          aria-label="Close"
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SuccessAlert;

