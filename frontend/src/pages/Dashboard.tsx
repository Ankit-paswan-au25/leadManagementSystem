import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import ErrorAlert from '../components/alerts/ErrorAlert';
import LinkedInScrapeModal from '../components/modal/LinkedInScrapeModal';
import { dashboardService, type DashboardStats } from '../services/dashboard.service';
import { linkedinService } from '../services/linkedin.service';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // LinkedIn scraper modal state
  const [linkedinModalOpen, setLinkedinModalOpen] = useState(false);
  const [linkedinSearchUrl, setLinkedinSearchUrl] = useState('');
  const [linkedinLimit, setLinkedinLimit] = useState(20);
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getDashboardStats();
      setStats(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard stats';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkedInScrape = async (searchUrl: string, limit: number) => {
    setLinkedinLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const response = await linkedinService.startScrape({
        searchUrl,
        limit: limit || 20,
      });
      setInfoMessage(response.message || 'Scraping started. Leads will appear shortly.');
      setLinkedinModalOpen(false);
      setLinkedinSearchUrl('');
      setLinkedinLimit(20);
      setTimeout(() => setInfoMessage(null), 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start LinkedIn scraping';
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setLinkedinLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">Welcome to your sales management dashboard</p>
        </div>
        <Button
          onClick={() => setLinkedinModalOpen(true)}
          variant="primary"
        >
          LinkedIn Scraper
        </Button>
      </div>

      {/* Info/Error Messages */}
      {infoMessage && (
        <div className="bg-success-50 border border-success-200 text-success-800 px-4 py-3 rounded-md">
          {infoMessage}
        </div>
      )}
      {errorMessage && (
        <div className="bg-error-50 border border-error-200 text-error-800 px-4 py-3 rounded-md">
          {errorMessage}
        </div>
      )}

      {/* Error Alert */}
      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Leads Box */}
          <Card className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-primary-200 dark:border-primary-700">
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
                Total Leads Created
              </p>
              <p className="text-3xl font-bold text-primary-900 dark:text-primary-100">
                {stats.totalLeads}
              </p>
              <p className="text-xs text-primary-600 dark:text-primary-400">
                Leads created by you
              </p>
            </div>
          </Card>

          {/* Sales Target Box */}
          <Card className="bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/20 dark:to-success-800/20 border-success-200 dark:border-success-700">
            <div className="space-y-2">
              <p className="text-sm font-medium text-success-700 dark:text-success-300">
                Sales Target
              </p>
              <p className="text-3xl font-bold text-success-900 dark:text-success-100">
                {stats.salesTarget.toLocaleString()}
              </p>
              <p className="text-xs text-success-600 dark:text-success-400">
                Your sales target
              </p>
            </div>
          </Card>

          {/* Zoho Pushed Box */}
          <Card className="bg-gradient-to-br from-info-50 to-info-100 dark:from-info-900/20 dark:to-info-800/20 border-info-200 dark:border-info-700">
            <div className="space-y-2">
              <p className="text-sm font-medium text-info-700 dark:text-info-300">
                Zoho Pushed
              </p>
              <p className="text-3xl font-bold text-info-900 dark:text-info-100">
                {stats.zohoPushedCount}
              </p>
              <p className="text-xs text-info-600 dark:text-info-400">
                Leads pushed to Zoho
              </p>
            </div>
          </Card>

          {/* Zoho Logged In Box */}
          <Card className={`bg-gradient-to-br ${stats.zohoLoggedIn ? 'from-success-50 to-success-100 dark:from-success-900/20 dark:to-success-800/20 border-success-200 dark:border-success-700' : 'from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 border-gray-200 dark:border-gray-700'}`}>
            <div className="space-y-2">
              <p className={`text-sm font-medium ${stats.zohoLoggedIn ? 'text-success-700 dark:text-success-300' : 'text-gray-700 dark:text-gray-300'}`}>
                Zoho Logged In
              </p>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${stats.zohoLoggedIn ? 'bg-success-500' : 'bg-gray-400'}`} />
                <p className={`text-xl font-semibold ${stats.zohoLoggedIn ? 'text-success-900 dark:text-success-100' : 'text-gray-900 dark:text-gray-100'}`}>
                  {stats.zohoLoggedIn ? 'Yes' : 'No'}
                </p>
              </div>
              <p className={`text-xs ${stats.zohoLoggedIn ? 'text-success-600 dark:text-success-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {stats.zohoLoggedIn ? 'Connected to Zoho' : 'Not connected'}
              </p>
            </div>
          </Card>
        </div>
      ) : null}

      {/* LinkedIn Scrape Modal */}
      <LinkedInScrapeModal
        isOpen={linkedinModalOpen}
        onClose={() => setLinkedinModalOpen(false)}
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

export default Dashboard;

