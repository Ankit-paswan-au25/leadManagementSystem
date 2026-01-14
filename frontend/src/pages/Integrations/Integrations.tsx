import React, { useState, useEffect, useRef } from 'react';
import { zohoService } from '../../services/zoho.service';
import { linkedinService } from '../../services/linkedin.service';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ConfirmModal from '../../components/modal/ConfirmModal';
import LinkedInScrapeModal from '../../components/modal/LinkedInScrapeModal';
import InfoAlert from '../../components/alerts/InfoAlert';
import ErrorAlert from '../../components/alerts/ErrorAlert';

const Integrations: React.FC = () => {
  const [fetchLoading, setFetchLoading] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [fetchModalOpen, setFetchModalOpen] = useState(false);
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // LinkedIn scraping state
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [linkedinModalOpen, setLinkedinModalOpen] = useState(false);
  const [linkedinSearchUrl, setLinkedinSearchUrl] = useState('');
  const [linkedinLimit, setLinkedinLimit] = useState(20);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleFetchLeads = async () => {
    setFetchLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    zohoService
      .fetchLeads()
      .then((message) => {
        setInfoMessage(message);
        setFetchModalOpen(false);
        setTimeout(() => setInfoMessage(null), 5000);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to fetch leads from Zoho';
        setErrorMessage(message);
        setFetchModalOpen(false);
        setTimeout(() => setErrorMessage(null), 5000);
      })
      .finally(() => {
        setFetchLoading(false);
      });
  };

  const handlePushLeads = async () => {
    setPushLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    zohoService
      .pushLeads()
      .then((message) => {
        setInfoMessage(message);
        setPushModalOpen(false);
        setTimeout(() => setInfoMessage(null), 5000);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to push leads to Zoho';
        setErrorMessage(message);
        setPushModalOpen(false);
        setTimeout(() => setErrorMessage(null), 5000);
      })
      .finally(() => {
        setPushLoading(false);
      });
  };

  // Stop polling when component unmounts or job completes/fails
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Stop polling when job completes or fails
  useEffect(() => {
    if (jobStatus === 'COMPLETED' || jobStatus === 'FAILED') {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [jobStatus]);

  // Optional: Poll job status if jobId exists and status API is available
  const startJobStatusPolling = (id: string) => {
    // Only poll if we have a jobId and status is not already completed/failed
    if (!id || jobStatus === 'COMPLETED' || jobStatus === 'FAILED') {
      return;
    }

    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 25 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const status = await linkedinService.getJobStatus(id);
        setJobStatus(status.status);

        if (status.status === 'COMPLETED' || status.status === 'FAILED') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          if (status.status === 'COMPLETED' && status.createdLeads) {
            setInfoMessage(`LinkedIn scraping completed. ${status.createdLeads} leads created.`);
            setTimeout(() => setInfoMessage(null), 5000);
          } else if (status.status === 'FAILED') {
            setErrorMessage('LinkedIn scraping job failed. Please try again.');
            setTimeout(() => setErrorMessage(null), 5000);
          }
        }
      } catch (err) {
        // Silently fail - job status API might not be available
        // Stop polling if we get an error
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }, 25000);
  };

  const handleLinkedInScrape = async (searchUrl: string, limit: number) => {
    setLinkedinLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    linkedinService
      .startScrape({
        searchUrl,
        limit: limit || 20,
      })
      .then((response) => {
        setInfoMessage(response.message || 'Scraping started. Leads will appear shortly.');
        setLinkedinModalOpen(false);
        setLinkedinSearchUrl('');
        setLinkedinLimit(20);
        setTimeout(() => setInfoMessage(null), 5000);

        // If jobId is returned, store it and optionally start polling
        if (response.jobId) {
          setJobId(response.jobId);
          setJobStatus('PENDING');
          // Try to start polling (will fail silently if API not available)
          startJobStatusPolling(response.jobId);
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to start LinkedIn scraping';
        setErrorMessage(message);
        setLinkedinModalOpen(false);
        setTimeout(() => setErrorMessage(null), 5000);
      })
      .finally(() => {
        setLinkedinLoading(false);
      });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Integrations</h1>
        <p className="text-text-secondary mt-1">Manage external integrations and sync data</p>
      </div>

      {/* Alerts */}
      {infoMessage && (
        <InfoAlert message={infoMessage} onClose={() => setInfoMessage(null)} />
      )}
      {errorMessage && (
        <ErrorAlert message={errorMessage} onClose={() => setErrorMessage(null)} />
      )}

      {/* Zoho Integration */}
      <Card>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Zoho CRM</h2>
            <p className="text-text-secondary mb-4">
              Sync leads between this system and Zoho CRM. Sync operations run asynchronously in the
              background.
            </p>
            <div className="space-y-2 text-sm text-text-tertiary">
              <p>• Fetch Leads: Import leads from Zoho CRM into this system</p>
              <p>• Push Leads: Export leads from this system to Zoho CRM</p>
            </div>
          </div>
          <div className="flex gap-3 ml-6">
            <Button
              variant="outline"
              onClick={() => setFetchModalOpen(true)}
              disabled={fetchLoading || pushLoading}
            >
              Fetch Leads
            </Button>
            <Button
              variant="primary"
              onClick={() => setPushModalOpen(true)}
              disabled={fetchLoading || pushLoading}
            >
              Push Leads
            </Button>
          </div>
        </div>
      </Card>

      {/* LinkedIn Integration */}
      <Card>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-text-primary mb-2">LinkedIn</h2>
            <p className="text-text-secondary mb-4">
              Scrape and import leads from LinkedIn. This will start an asynchronous scraping job that
              runs in the background. Scraped leads will automatically appear in your leads list.
            </p>
            <div className="space-y-2 text-sm text-text-tertiary mb-4">
              <p>• Enter a LinkedIn search URL to scrape leads</p>
              <p>• Scraping runs asynchronously in the background</p>
              <p>• New leads will appear automatically when scraping completes</p>
            </div>
            {jobStatus && jobStatus !== 'COMPLETED' && jobStatus !== 'FAILED' && (
              <div className="mt-3 text-sm text-info-600">
                Status: {jobStatus === 'PENDING' ? 'Pending...' : jobStatus === 'RUNNING' ? 'Running...' : jobStatus}
              </div>
            )}
          </div>
          <div className="ml-6">
            <Button
              variant="primary"
              onClick={() => setLinkedinModalOpen(true)}
              disabled={linkedinLoading || fetchLoading || pushLoading}
            >
              Start Scraping
            </Button>
          </div>
        </div>
      </Card>

      {/* Fetch Leads Confirmation Modal */}
      <ConfirmModal
        isOpen={fetchModalOpen}
        onClose={() => setFetchModalOpen(false)}
        onConfirm={handleFetchLeads}
        title="Fetch Leads from Zoho"
        message="This will start an asynchronous job to fetch leads from Zoho CRM. The process may take a few minutes to complete."
        confirmText="Start Fetch"
        cancelText="Cancel"
        variant="info"
        isLoading={fetchLoading}
      />

      {/* Push Leads Confirmation Modal */}
      <ConfirmModal
        isOpen={pushModalOpen}
        onClose={() => setPushModalOpen(false)}
        onConfirm={handlePushLeads}
        title="Push Leads to Zoho"
        message="This will start an asynchronous job to push leads from this system to Zoho CRM. The process may take a few minutes to complete."
        confirmText="Start Push"
        cancelText="Cancel"
        variant="info"
        isLoading={pushLoading}
      />

      {/* LinkedIn Scrape Modal */}
      <LinkedInScrapeModal
        isOpen={linkedinModalOpen}
        onClose={() => {
          setLinkedinModalOpen(false);
          setLinkedinSearchUrl('');
          setLinkedinLimit(20);
        }}
        onConfirm={handleLinkedInScrape}
        searchUrl={linkedinSearchUrl}
        limit={linkedinLimit}
        onSearchUrlChange={setLinkedinSearchUrl}
        onLimitChange={setLinkedinLimit}
        isLoading={linkedinLoading}
      />
    </div>
  );
};

export default Integrations;
