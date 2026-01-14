import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { activityService, type ActivityFilters } from '../services/activity.service';
import type { Activity } from '../types/activity.types';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Skeleton from '../components/ui/Skeleton';
import ErrorAlert from '../components/alerts/ErrorAlert';
import { getActivityLabel } from '../utils/activityLabels';

const ActivityLogs: React.FC = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActivityFilters>({
    limit: 100,
  });
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadActivities();
  }, [filters.activityType, filters.performedBy, filters.leadId]);

  const loadActivities = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await activityService.getActivities(filters);
      setActivities(result.activities);
      setTotalCount(result.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load activities';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (activityType: string): string => {
    if (activityType.includes('EMAIL')) {
      return '📧';
    }
    if (activityType.includes('OWNER')) {
      return '👤';
    }
    if (activityType.includes('STATUS')) {
      return '📊';
    }
    if (activityType.includes('CREATED')) {
      return '✨';
    }
    if (activityType.includes('FOLLOW')) {
      return '📅';
    }
    if (activityType.includes('SCHEDULE')) {
      return '⏰';
    }
    if (activityType.includes('NOTE')) {
      return '📝';
    }
    if (activityType.includes('CONTACT')) {
      return '☎️';
    }
    if (activityType.includes('CUSTOMER')) {
      return '👥';
    }
    if (activityType.includes('PRODUCT')) {
      return '📦';
    }
    return '🔔';
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const handleRowClick = (activity: Activity) => {
    if (activity.leadId) {
      navigate(`/dashboard/leads/${activity.leadId}`);
    }
  };

  const columns: Array<{
    key: string;
    header: string;
    render?: (activity: Activity) => React.ReactNode;
  }> = [
      {
        key: 'activity',
        header: 'Activity',
        render: (activity: Activity) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-lg flex-shrink-0">
              {getActivityIcon(activity.activityType)}
            </div>
            <div>
              <div className="font-medium text-text-primary">{getActivityLabel(activity.activityType)}</div>
              {activity.description && (
                <div className="text-sm text-text-secondary mt-1">{activity.description}</div>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'lead',
        header: 'Lead',
        render: (activity: Activity) => (
          <div>
            <div className="font-medium text-text-primary">{activity.leadName}</div>
            {activity.leadEmail && (
              <div className="text-sm text-text-secondary">{activity.leadEmail}</div>
            )}
          </div>
        ),
      },
      {
        key: 'performedBy',
        header: 'Performed By',
        render: (activity: Activity) => (
          <div>
            <div className="font-medium text-text-primary">{activity.performedBy.name}</div>
            {activity.performedBy.email && (
              <div className="text-sm text-text-secondary">{activity.performedBy.email}</div>
            )}
          </div>
        ),
      },
      {
        key: 'ownerAtTime',
        header: 'Owner at Time',
        render: (activity: Activity) => (
          <div>
            <div className="text-text-secondary">{activity.ownerAtTime.name}</div>
          </div>
        ),
      },
      {
        key: 'timestamp',
        header: 'Date & Time',
        render: (activity: Activity) => (
          <div className="text-text-secondary whitespace-nowrap">
            {formatTimestamp(activity.timestamp)}
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
                <Skeleton key={index} className="h-20 w-full" />
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
          <button
            onClick={loadActivities}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Activity Logs</h1>
        <p className="text-text-secondary mt-1">
          {totalCount} {totalCount === 1 ? 'activity' : 'activities'} in total
        </p>
      </div>

      {/* Table */}
      <Card>
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary">No activities found</p>
          </div>
        ) : (
          <Table
            data={activities}
            columns={columns}
            onRowClick={handleRowClick}
          />
        )}
      </Card>
    </div>
  );
};

export default ActivityLogs;

