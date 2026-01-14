import React from 'react';
import type { LeadActivity } from '../../types/activity.types';
import { getActivityLabel } from '../../utils/activityLabels';

interface ActivityTimelineProps {
  activities: LeadActivity[];
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
  const getActivityIcon = (activityType: string, performedByType: string) => {
    if (performedByType === 'SYSTEM') {
      return '⚙️';
    }
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
    return '📝';
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const label = getActivityLabel(activity.activityType);
        const icon = getActivityIcon(activity.activityType, activity.performedByType);

        return (
          <div
            key={activity.id}
            className="flex gap-4 pb-4 border-b border-border-default last:border-b-0"
          >
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-lg">
                {icon}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-text-primary font-medium">{label}</p>
                  {activity.description && (
                    <p className="text-text-secondary text-sm mt-1">{activity.description}</p>
                  )}
                  {activity.metadata && typeof activity.metadata === 'object' && Object.keys(activity.metadata).length > 0 && (
                    <div className="text-text-secondary text-sm mt-1">
                      {Object.entries(activity.metadata).map(([key, value]) => (
                        <span key={key} className="mr-3">
                          <span className="font-medium">{key}:</span> {String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                  {activity.metadata && typeof activity.metadata === 'string' && (
                    <p className="text-text-secondary text-sm mt-1">{activity.metadata}</p>
                  )}
                </div>
                <div className="text-right text-sm text-text-secondary">
                  {formatTimestamp(activity.timestamp || activity.createdAt)}
                </div>
              </div>

              {/* Performed By & Owner */}
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-text-secondary">Performed by: </span>
                  <span className="text-text-primary font-medium">
                    {activity.performedByType === 'SYSTEM'
                      ? 'System'
                      : activity.performedByName || 'Unknown'}
                  </span>
                  {activity.performedByType !== 'SYSTEM' && (
                    <span className="text-text-secondary ml-1">
                      ({activity.performedByType})
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-text-secondary">Owner at that time: </span>
                  <span className="text-text-primary font-medium">
                    {activity.ownerAtThatTimeName || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityTimeline;
