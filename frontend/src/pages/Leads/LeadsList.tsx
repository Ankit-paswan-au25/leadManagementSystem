import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authStore } from '../../store/auth.store';
import { leadsService } from '../../services/leads.service';
import type { Lead, LeadFilters, LeadStatus, PaginationInfo } from '../../types/lead.types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import StatusBadge from '../../components/ui/StatusBadge';
import Skeleton from '../../components/ui/Skeleton';
import ErrorAlert from '../../components/alerts/ErrorAlert';
import Button from '../../components/ui/Button';
import CreateLeadModal from '../../components/Leads/CreateLeadModal';
import RequestOwnershipModal from '../../components/Leads/RequestOwnershipModal';
import Pagination from '../../components/ui/Pagination';

const LeadsList: React.FC = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [requestOwnershipModal, setRequestOwnershipModal] = useState<{
    isOpen: boolean;
    leadId: string;
    leadName: string;
    companyName?: string | null;
    productName?: string | null;
    productCode?: string | null;
  }>({
    isOpen: false,
    leadId: '',
    leadName: '',
    companyName: null,
    productName: null,
    productCode: null,
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [filters, setFilters] = useState<LeadFilters>({
    status: '',
    ownerId: '',
    search: '',
  });

  const isAdmin = authStore.currentRole === 'ADMIN';

  // Reset to page 1 when filters change (except page changes)
  useEffect(() => {
    if (filters.status || filters.ownerId) {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  }, [filters.status, filters.ownerId]);

  // Reload leads when filters change (status, ownerId) or pagination changes
  // Search is handled client-side for better UX
  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.ownerId, pagination.page]);

  const loadLeads = async () => {
    setIsLoading(true);
    setError(null);

    // Build filters for API call
    const apiFilters: LeadFilters = {
      page: pagination.page,
      limit: pagination.limit,
    };
    if (filters.status) {
      apiFilters.status = filters.status as LeadStatus;
    }
    if (filters.ownerId && isAdmin) {
      apiFilters.ownerId = filters.ownerId;
    }

    leadsService
      .getLeads(apiFilters)
      .then((response) => {
        setLeads(response.leads);
        setPagination(response.pagination);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load leads';
        setError(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  // Apply client-side search filter
  // Note: When search is active, pagination is disabled and all results are shown
  const filteredLeads = React.useMemo(() => {
    if (!filters.search) {
      return leads;
    }

    const searchLower = filters.search.toLowerCase();
    return leads.filter(
      (lead) =>
        lead.leadName.toLowerCase().includes(searchLower) ||
        lead.companyName?.toLowerCase().includes(searchLower) ||
        lead.email.toLowerCase().includes(searchLower)
    );
  }, [leads, filters.search]);

  const handleFilterChange = (key: keyof LeadFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleRowClick = (lead: Lead) => {
    navigate(`/dashboard/leads/${lead.id}`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Extract unique owners from leads for filter dropdown
  const owners = React.useMemo(() => {
    const ownerMap = new Map<string, string>();
    leads.forEach((lead) => {
      if (!ownerMap.has(lead.ownerId)) {
        ownerMap.set(lead.ownerId, lead.ownerName);
      }
    });
    return Array.from(ownerMap.entries()).map(([id, name]) => ({ id, name }));
  }, [leads]);

  const columns: Array<{
    key: string;
    header: string;
    render?: (lead: Lead) => React.ReactNode;
    className?: string;
  }> = [
      {
        key: 'leadName',
        header: 'Lead Name',
        render: (lead: Lead) => (
          <div>
            <div className="font-medium text-text-primary">{lead.leadName}</div>
          </div>
        ),
      },
      {
        key: 'companyName',
        header: 'Company',
        render: (lead: Lead) => (
          <div className="text-text-secondary">{lead.companyName || 'N/A'}</div>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        render: (lead: Lead) => (
          <a
            href={`mailto:${lead.email}`}
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
            onClick={(e) => e.stopPropagation()}
          >
            {lead.email}
          </a>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (lead: Lead) => <StatusBadge status={lead.status} />,
      },
      {
        key: 'productName',
        header: 'Product',
        render: (lead: Lead) => (
          <div className="text-text-secondary">
            {lead.productName || 'N/A'}
            {lead.productCode && (
              <span className="text-xs ml-1 text-text-tertiary">({lead.productCode})</span>
            )}
          </div>
        ),
      },
      {
        key: 'ownerName',
        header: 'Owner Name',
        render: (lead: Lead) => (
          <div className="text-text-secondary">{lead.ownerName}</div>
        ),
      },
      {
        key: 'nextFollowUpAt',
        header: 'Next Follow-up',
        render: (lead: Lead) => (
          <div className="text-text-secondary">{formatDate(lead.nextFollowUpAt)}</div>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (lead: Lead) => (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 text-sm font-medium"
              onClick={() => handleRowClick(lead)}
            >
              View
            </button>
          </div>
        ),
      },
      {
        key: 'changeOwner',
        header: 'Change Owner',
        render: (lead: Lead) => (
          <div onClick={(e) => e.stopPropagation()}>
            {!isAdmin && (
              <button
                className="text-warning-600 hover:text-warning-700 dark:text-warning-400 text-sm font-medium"
                onClick={() => {
                  setRequestOwnershipModal({
                    isOpen: true,
                    leadId: lead.id,
                    leadName: lead.leadName,
                    companyName: lead.companyName,
                    productName: lead.productName,
                    productCode: lead.productCode,
                  });
                }}
              >
                Request
              </button>
            )}
          </div>
        ),
      },
    ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ErrorAlert message={error} onClose={() => setError(null)} />
        <Card>
          <Button onClick={loadLeads} variant="primary">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Leads</h1>
          <p className="text-text-secondary mt-1">
            {pagination.total} {pagination.total === 1 ? 'lead' : 'leads'} found
            {filters.search && ` (${filteredLeads.length} matching search)`}
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          variant="primary"
        >
          Create Lead
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-text-primary mb-1">
              Search
            </label>
            <input
              id="search"
              type="text"
              placeholder="Search leads, company, email..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full px-4 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-text-primary mb-1">
              Status
            </label>
            <select
              id="status"
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-4 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary"
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="FOLLOW_UP">Follow Up</option>
              <option value="REPLIED">Replied</option>
              <option value="CLOSED">Closed</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="LOST">Lost</option>
              <option value="WON">Won</option>
            </select>
          </div>

          {/* Owner Filter (Admin only) */}
          {isAdmin && (
            <div>
              <label htmlFor="owner" className="block text-sm font-medium text-text-primary mb-1">
                Owner
              </label>
              <select
                id="owner"
                value={filters.ownerId || ''}
                onChange={(e) => handleFilterChange('ownerId', e.target.value)}
                className="w-full px-4 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary"
              >
                <option value="">All Owners</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {filteredLeads.length === 0 && !isLoading ? (
          <div className="text-center py-12">
            <p className="text-text-secondary mb-4">
              {leads.length === 0 ? 'No leads found' : 'No leads match your filters'}
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              variant="primary"
            >
              Create Lead
            </Button>
          </div>
        ) : (
          <>
            <Table
              data={filteredLeads}
              columns={columns}
              onRowClick={handleRowClick}
              emptyMessage="No leads match your filters"
            />
            {/* Pagination - only show if not using search filter */}
            {!filters.search && pagination.totalPages > 1 && (
              <div className="mt-6 pt-6 border-t border-border-default">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.total}
                  itemsPerPage={pagination.limit}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </Card>

      {/* Create Lead Modal */}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
        }}
        onSuccess={() => {
          // Reset to page 1 to show the newly created lead at the top
          setPagination((prev) => ({ ...prev, page: 1 }));
          // Reload leads to show the newly created lead
          loadLeads();
          // Close modal
          setIsCreateModalOpen(false);
        }}
      />

      {/* Request Ownership Change Modal */}
      <RequestOwnershipModal
        isOpen={requestOwnershipModal.isOpen}
        onClose={() => {
          setRequestOwnershipModal({
            isOpen: false,
            leadId: '',
            leadName: '',
            companyName: null,
            productName: null,
            productCode: null,
          });
        }}
        leadId={requestOwnershipModal.leadId}
        leadName={requestOwnershipModal.leadName}
        companyName={requestOwnershipModal.companyName}
        productName={requestOwnershipModal.productName}
        productCode={requestOwnershipModal.productCode}
        onSuccess={() => {
          // Reload leads to reflect any changes
          loadLeads();
        }}
      />
    </div>
  );
};

export default LeadsList;
