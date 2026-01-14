import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authStore } from '../../store/auth.store';
import { leadsService } from '../../services/leads.service';
import type { Lead } from '../../types/lead.types';
import type { LeadActivity } from '../../types/activity.types';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import Skeleton from '../../components/ui/Skeleton';
import ErrorAlert from '../../components/alerts/ErrorAlert';
import InfoAlert from '../../components/alerts/InfoAlert';
import Button from '../../components/ui/Button';
import ActivityTimeline from '../../components/Leads/ActivityTimeline';
import RequestOwnershipModal from '../../components/Leads/RequestOwnershipModal';
import EditLeadModal from '../../components/Leads/EditLeadModal';

const LeadDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const isAdmin = authStore.currentRole === 'ADMIN';
  const currentUser = authStore.currentUser;
  const isCurrentOwner = lead?.ownerId === currentUser?.id;

  useEffect(() => {
    if (id) {
      loadLeadData();
    }
  }, [id]);

  // Refresh activities when component mounts or id changes
  // This ensures scheduler/email/reply events appear without manual reload
  useEffect(() => {
    if (id && lead) {
      // Refresh activities to get latest events (scheduler, email, replies)
      leadsService
        .getLeadActivities(id)
        .then((activitiesData) => {
          setActivities(activitiesData);
        })
        .catch(() => {
          // Silent failure - activities will be refreshed on next loadLeadData call
        });
    }
  }, [id]); // Only on id change, not on every render

  const loadLeadData = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch lead and activities in parallel
      const [leadData, activitiesData] = await Promise.all([
        leadsService.getLeadById(id),
        leadsService.getLeadActivities(id).catch((err) => {
          // If activities fail, log but don't block lead display
          console.warn('Failed to load activities:', err);
          return [];
        }),
      ]);
      
      console.log('Lead data received:', leadData);
      console.log('Activities data received:', activitiesData);
      
      setLead(leadData);
      setActivities(activitiesData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load lead details';
      setError(message);
      console.error('Error loading lead data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </Card>
        <Card>
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ErrorAlert message={error} onClose={() => setError(null)} />
        <Card>
          <div className="flex gap-4">
            <Button onClick={loadLeadData} variant="primary">
              Retry
            </Button>
            <Button onClick={() => navigate('/dashboard/leads')} variant="secondary">
              Back to Leads
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="space-y-6">
        <ErrorAlert message="Lead not found" onClose={() => navigate('/dashboard/leads')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <button
            onClick={() => navigate('/dashboard/leads')}
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 text-sm font-medium mb-2"
          >
            ← Back to Leads
          </button>
          <h1 className="text-2xl font-semibold text-text-primary">{lead.leadName}</h1>
          <p className="text-text-secondary mt-1">{lead.companyName || 'No company'}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => {
              setEditModalOpen(true);
            }}
          >
            Edit
          </Button>
          {!isAdmin && isCurrentOwner && (
            <Button
              variant="warning"
              onClick={() => {
                setRequestModalOpen(true);
              }}
            >
              Request Ownership Change
            </Button>
          )}
          {isAdmin && (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  // Future: Change owner
                }}
              >
                Change Owner
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  // Future: Close lead
                }}
              >
                Close Lead
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Lead Details */}
      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Lead Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Lead Name</label>
            <p className="text-text-primary">{lead.leadName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Company</label>
            <p className="text-text-primary">{lead.companyName || 'N/A'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
            <a
              href={`mailto:${lead.email}`}
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              {lead.email}
            </a>
          </div>

          {lead.phone && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Phone</label>
              <p className="text-text-primary">{lead.phone}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
            <StatusBadge status={lead.status} />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Current Owner</label>
            <p className="text-text-primary">{lead.ownerName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Created Date
            </label>
            <p className="text-text-primary">{formatDate(lead.createdAt)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Created By
            </label>
            <p className="text-text-primary">{lead.createdByName || 'Unknown'}</p>
          </div>

          {lead.productName && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Product</label>
              <p className="text-text-primary">
                {lead.productName}
                {lead.productCode && (
                  <span className="text-text-secondary ml-2">({lead.productCode})</span>
                )}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Next Follow-up
            </label>
            <p className="text-text-primary">{formatDate(lead.nextFollowUpAt)}</p>
          </div>
        </div>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Activity Timeline</h2>
        {activities.length > 0 ? (
          <ActivityTimeline activities={activities} />
        ) : (
          <div className="text-center py-12">
            <p className="text-text-secondary">No activity recorded yet</p>
          </div>
        )}
      </Card>

      {/* Edit Lead Modal */}
      <EditLeadModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        lead={lead}
        onSuccess={() => {
          setInfoMessage('Lead updated successfully');
          setTimeout(() => setInfoMessage(null), 3000);
          // Reload lead data to reflect changes
          loadLeadData();
        }}
      />

      {/* Request Ownership Modal */}
      {lead && (
        <RequestOwnershipModal
          isOpen={requestModalOpen}
          onClose={() => setRequestModalOpen(false)}
          leadId={lead.id}
          leadName={lead.leadName}
          companyName={lead.companyName}
          productName={lead.productName}
          productCode={lead.productCode}
          onSuccess={() => {
            setInfoMessage('Ownership change request submitted successfully');
            setTimeout(() => setInfoMessage(null), 3000);
            // Optionally reload lead data to reflect changes
            loadLeadData();
          }}
        />
      )}

      {/* Info Alert */}
      {infoMessage && (
        <div className="fixed top-4 right-4 z-50">
          <InfoAlert message={infoMessage} onClose={() => setInfoMessage(null)} />
        </div>
      )}
    </div>
  );
};

export default LeadDetail;
