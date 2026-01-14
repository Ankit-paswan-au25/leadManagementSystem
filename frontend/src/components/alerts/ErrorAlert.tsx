import React from 'react';

export interface ErrorAlertProps {
  message: string;
  onClose?: () => void;
  className?: string;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  message,
  onClose,
  className = '',
}) => {
  return (
    <div
      className={`flex items-center p-4 mb-4 text-sm text-error-800 bg-error-50 border border-error-200 rounded-lg dark:bg-error-900/20 dark:text-error-400 dark:border-error-800 ${className}`}
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
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          type="button"
          className="ml-auto -mx-1.5 -my-1.5 text-error-500 hover:text-error-600 rounded-lg focus:ring-2 focus:ring-error-400 p-1.5 inline-flex h-6 w-6 dark:hover:text-error-300"
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

export default ErrorAlert;

