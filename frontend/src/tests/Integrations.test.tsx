/**
 * Integrations Page Tests
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Integrations from '../pages/Integrations/Integrations';
import { zohoService } from '../services/zoho.service';
import { linkedinService } from '../services/linkedin.service';

// Mock zoho service
jest.mock('../services/zoho.service', () => ({
  zohoService: {
    fetchLeads: jest.fn(),
    pushLeads: jest.fn(),
  },
}));

// Mock linkedin service
jest.mock('../services/linkedin.service', () => ({
  linkedinService: {
    startScrape: jest.fn(),
    getJobStatus: jest.fn(),
  },
}));

const mockZohoService = zohoService as jest.Mocked<typeof zohoService>;
const mockLinkedinService = linkedinService as jest.Mocked<typeof linkedinService>;

const renderIntegrations = () => {
  return render(
    <MemoryRouter>
      <Integrations />
    </MemoryRouter>
  );
};

describe('Integrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders page title', () => {
      renderIntegrations();

      expect(screen.getByText('Integrations')).toBeInTheDocument();
      expect(screen.getByText(/Manage external integrations/i)).toBeInTheDocument();
    });

    it('renders Zoho integration section', () => {
      renderIntegrations();

      expect(screen.getByText('Zoho CRM')).toBeInTheDocument();
      expect(screen.getByText('Fetch Leads')).toBeInTheDocument();
      expect(screen.getByText('Push Leads')).toBeInTheDocument();
    });

    it('renders LinkedIn integration section', () => {
      renderIntegrations();

      expect(screen.getByText('LinkedIn')).toBeInTheDocument();
      expect(screen.getByText('Start Scraping')).toBeInTheDocument();
    });
  });

  describe('Zoho Fetch Leads', () => {
    it('opens confirmation modal when fetch button clicked', async () => {
      const user = userEvent.setup();
      renderIntegrations();

      const fetchButton = screen.getByText('Fetch Leads');
      await user.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByText('Fetch Leads from Zoho')).toBeInTheDocument();
      });
    });

    it('calls fetchLeads on confirm', async () => {
      const user = userEvent.setup();
      mockZohoService.fetchLeads.mockResolvedValue('Zoho lead fetch started');

      renderIntegrations();

      const fetchButton = screen.getByText('Fetch Leads');
      await user.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByText('Fetch Leads from Zoho')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Start Fetch');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockZohoService.fetchLeads).toHaveBeenCalledTimes(1);
      });
    });

    it('shows InfoAlert on successful fetch', async () => {
      const user = userEvent.setup();
      mockZohoService.fetchLeads.mockResolvedValue('Zoho lead fetch started');

      renderIntegrations();

      const fetchButton = screen.getByText('Fetch Leads');
      await user.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByText('Fetch Leads from Zoho')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Start Fetch');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Zoho lead fetch started')).toBeInTheDocument();
      });
    });

    it('shows ErrorAlert on fetch failure', async () => {
      const user = userEvent.setup();
      mockZohoService.fetchLeads.mockRejectedValue(new Error('Failed to fetch leads from Zoho'));

      renderIntegrations();

      const fetchButton = screen.getByText('Fetch Leads');
      await user.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByText('Fetch Leads from Zoho')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Start Fetch');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch leads from Zoho/i)).toBeInTheDocument();
      });
    });
  });

  describe('Zoho Push Leads', () => {
    it('opens confirmation modal when push button clicked', async () => {
      const user = userEvent.setup();
      renderIntegrations();

      const pushButton = screen.getByText('Push Leads');
      await user.click(pushButton);

      await waitFor(() => {
        expect(screen.getByText('Push Leads to Zoho')).toBeInTheDocument();
      });
    });

    it('calls pushLeads on confirm', async () => {
      const user = userEvent.setup();
      mockZohoService.pushLeads.mockResolvedValue('Zoho lead push started');

      renderIntegrations();

      const pushButton = screen.getByText('Push Leads');
      await user.click(pushButton);

      await waitFor(() => {
        expect(screen.getByText('Push Leads to Zoho')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Start Push');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockZohoService.pushLeads).toHaveBeenCalledTimes(1);
      });
    });

    it('shows InfoAlert on successful push', async () => {
      const user = userEvent.setup();
      mockZohoService.pushLeads.mockResolvedValue('Zoho lead push started');

      renderIntegrations();

      const pushButton = screen.getByText('Push Leads');
      await user.click(pushButton);

      await waitFor(() => {
        expect(screen.getByText('Push Leads to Zoho')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Start Push');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Zoho lead push started')).toBeInTheDocument();
      });
    });

    it('shows ErrorAlert on push failure', async () => {
      const user = userEvent.setup();
      mockZohoService.pushLeads.mockRejectedValue(new Error('Failed to push leads to Zoho'));

      renderIntegrations();

      const pushButton = screen.getByText('Push Leads');
      await user.click(pushButton);

      await waitFor(() => {
        expect(screen.getByText('Push Leads to Zoho')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Start Push');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to push leads to Zoho/i)).toBeInTheDocument();
      });
    });
  });

  describe('LinkedIn Scraping', () => {
    it('opens scrape modal when start scraping button clicked', async () => {
      const user = userEvent.setup();
      renderIntegrations();

      const scrapeButton = screen.getByText('Start Scraping');
      await user.click(scrapeButton);

      await waitFor(() => {
        expect(screen.getByText('Start LinkedIn Scraping')).toBeInTheDocument();
      });
    });

    it('calls startScrape on confirm with form data', async () => {
      const user = userEvent.setup();
      mockLinkedinService.startScrape.mockResolvedValue({
        success: true,
        message: 'LinkedIn scraping started',
        jobId: 'job_123',
      });

      renderIntegrations();

      const scrapeButton = screen.getByText('Start Scraping');
      await user.click(scrapeButton);

      await waitFor(() => {
        expect(screen.getByText('Start LinkedIn Scraping')).toBeInTheDocument();
      });

      // Fill in the form
      const urlInput = screen.getByPlaceholderText(/linkedin.com\/search/i);
      await user.clear(urlInput);
      await user.type(urlInput, 'https://www.linkedin.com/search/results/people/');

      const limitInput = screen.getByLabelText(/Lead Limit/i) as HTMLInputElement;
      // Use fireEvent to directly set the value for number inputs (avoids typing issues)
      fireEvent.change(limitInput, { target: { value: '30' } });

      // Get the modal's confirm button (not the one on the main page)
      const confirmButtons = screen.getAllByText('Start Scraping');
      const confirmButton = confirmButtons.find(btn => btn.closest('[role="dialog"]')) || confirmButtons[1];
      await user.click(confirmButton!);

      await waitFor(() => {
        expect(mockLinkedinService.startScrape).toHaveBeenCalledWith({
          searchUrl: 'https://www.linkedin.com/search/results/people/',
          limit: 30,
        });
      });
    });

    it('shows InfoAlert on successful scrape', async () => {
      const user = userEvent.setup();
      mockLinkedinService.startScrape.mockResolvedValue({
        success: true,
        message: 'LinkedIn scraping started',
        jobId: 'job_123',
      });

      renderIntegrations();

      const scrapeButton = screen.getByText('Start Scraping');
      await user.click(scrapeButton);

      await waitFor(() => {
        expect(screen.getByText('Start LinkedIn Scraping')).toBeInTheDocument();
      });

      const urlInput = screen.getByPlaceholderText(/linkedin.com\/search/i);
      await user.type(urlInput, 'https://www.linkedin.com/search/results/people/');

      // Get the modal's confirm button (not the one on the main page)
      const confirmButtons = screen.getAllByText('Start Scraping');
      const confirmButton = confirmButtons.find(btn => btn.closest('[role="dialog"]')) || confirmButtons[1];
      await user.click(confirmButton!);

      await waitFor(() => {
        expect(screen.getByText(/LinkedIn scraping started/i)).toBeInTheDocument();
      });
    });

    it('shows ErrorAlert on scrape failure', async () => {
      const user = userEvent.setup();
      mockLinkedinService.startScrape.mockRejectedValue(
        new Error('Failed to start LinkedIn scraping')
      );

      renderIntegrations();

      const scrapeButton = screen.getByText('Start Scraping');
      await user.click(scrapeButton);

      await waitFor(() => {
        expect(screen.getByText('Start LinkedIn Scraping')).toBeInTheDocument();
      });

      const urlInput = screen.getByPlaceholderText(/linkedin.com\/search/i);
      await user.type(urlInput, 'https://www.linkedin.com/search/results/people/');

      // Get the modal's confirm button (not the one on the main page)
      const confirmButtons = screen.getAllByText('Start Scraping');
      const confirmButton = confirmButtons.find(btn => btn.closest('[role="dialog"]')) || confirmButtons[1];
      await user.click(confirmButton!);

      await waitFor(() => {
        expect(screen.getByText(/Failed to start LinkedIn scraping/i)).toBeInTheDocument();
      });
    });

    it('disables confirm button when search URL is empty', async () => {
      const user = userEvent.setup();
      renderIntegrations();

      const scrapeButton = screen.getByText('Start Scraping');
      await user.click(scrapeButton);

      await waitFor(() => {
        expect(screen.getByText('Start LinkedIn Scraping')).toBeInTheDocument();
      });

      // Get the modal's confirm button (not the one on the main page)
      const confirmButtons = screen.getAllByText('Start Scraping');
      const confirmButton = confirmButtons.find(btn => btn.closest('[role="dialog"]')) || confirmButtons[1];
      // Button should be disabled when URL is empty
      expect(confirmButton).toBeDisabled();
    });

    it('disables button while scraping is in progress', async () => {
      const user = userEvent.setup();
      mockLinkedinService.startScrape.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  message: 'LinkedIn scraping started',
                  jobId: 'job_123',
                }),
              500
            )
          )
      );

      renderIntegrations();

      const scrapeButton = screen.getByText('Start Scraping');
      await user.click(scrapeButton);

      await waitFor(() => {
        expect(screen.getByText('Start LinkedIn Scraping')).toBeInTheDocument();
      });

      const urlInput = screen.getByPlaceholderText(/linkedin.com\/search/i);
      await user.type(urlInput, 'https://www.linkedin.com/search/results/people/');

      // Get the modal's confirm button (not the one on the main page)
      const confirmButtons = screen.getAllByText('Start Scraping');
      const confirmButton = confirmButtons.find(btn => btn.closest('[role="dialog"]')) || confirmButtons[1];
      await user.click(confirmButton!);

      // Button should be disabled during loading
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('Button States', () => {
    it('disables buttons while loading', async () => {
      const user = userEvent.setup();
      mockZohoService.fetchLeads.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('Started'), 500))
      );

      renderIntegrations();

      const fetchButton = screen.getByText('Fetch Leads');
      await user.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByText('Fetch Leads from Zoho')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Start Fetch');
      await user.click(confirmButton);

      // Buttons should be disabled during loading
      expect(confirmButton).toBeDisabled();
    });
  });
});
