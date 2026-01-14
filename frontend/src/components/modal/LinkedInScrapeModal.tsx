import React from 'react';
import AppModal from './AppModal';
import Button from '../ui/Button';

export interface LinkedInScrapeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (searchUrl: string, limit: number) => void;
  searchUrl: string;
  limit: number;
  onSearchUrlChange: (url: string) => void;
  onLimitChange: (limit: number) => void;
  isLoading?: boolean;
}

const LinkedInScrapeModal: React.FC<LinkedInScrapeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  searchUrl,
  limit,
  onSearchUrlChange,
  onLimitChange,
  isLoading = false,
}) => {
  const handleConfirm = () => {
    if (searchUrl.trim()) {
      onConfirm(searchUrl.trim(), limit);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="Start LinkedIn Scraping"
      size="md"
      showCloseButton={!isLoading}
    >
      <div className="space-y-4">
        <div className="bg-warning-50 border border-warning-200 rounded-md p-3">
          <p className="text-warning-800 text-sm font-medium mb-1">
            ⚠️ Important: LinkedIn Terms of Service
          </p>
          <p className="text-warning-700 text-sm">
            LinkedIn scraping must comply with LinkedIn's Terms of Service. Only scrape publicly
            available data and respect rate limits. Use this feature responsibly.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              LinkedIn Search URL <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={searchUrl}
              onChange={(e) => onSearchUrlChange(e.target.value)}
              placeholder="https://www.linkedin.com/search/results/people/..."
              className="w-full px-3 py-2 border border-border-primary rounded-md bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isLoading}
            />
            <p className="text-xs text-text-tertiary mt-1">
              Enter the full URL of a LinkedIn people search results page
            </p>
          </div>

          <div>
            <label htmlFor="lead-limit" className="block text-sm font-medium text-text-primary mb-1">
              Lead Limit (optional)
            </label>
            <input
              id="lead-limit"
              type="number"
              value={limit}
              onChange={(e) => onLimitChange(parseInt(e.target.value) || 20)}
              min="1"
              max="100"
              className="w-full px-3 py-2 border border-border-primary rounded-md bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isLoading}
            />
            <p className="text-xs text-text-tertiary mt-1">
              Maximum number of leads to scrape (default: 20)
            </p>
          </div>
        </div>

        <div className="bg-info-50 border border-info-200 rounded-md p-3 mt-4">
          <p className="text-info-800 text-sm">
            This will start an asynchronous scraping job that runs in the background. Scraped leads
            will automatically appear in your leads list when the job completes.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={!searchUrl.trim() || isLoading}
          >
            Start Scraping
          </Button>
        </div>
      </div>
    </AppModal>
  );
};

export default LinkedInScrapeModal;

