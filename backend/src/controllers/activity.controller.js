const LeadActivity = require('../models/LeadActivity.model');
const ApiResponse = require('../core/ApiResponse');
const ApiError = require('../core/ApiError');

/**
 * Get All Activities
 * GET /activities
 * 
 * Access: ADMIN only
 * 
 * Returns all activities in the system (for Activity Logs page)
 * Query params:
 * - activityType (optional) - Filter by activity type
 * - performedBy (optional) - Filter by user ID
 * - leadId (optional) - Filter by lead ID
 * - limit (optional) - Limit results (default: 100)
 * - skip (optional) - Skip results for pagination
 */
const getAllActivities = async (req, res) => {
  const currentUser = req.user;

  // Only ADMIN can access all activities
  if (currentUser.role !== 'ADMIN') {
    throw ApiError.forbidden('Only admins can view all activities');
  }

  const { activityType, performedBy, leadId, limit = 100, skip = 0 } = req.query;

  try {
    // Build query
    const query = {};

    if (activityType) {
      query.activityType = activityType;
    }

    if (performedBy) {
      query.performedBy = performedBy;
    }

    if (leadId) {
      query.leadId = leadId;
    }

    // Fetch activities with populated references
    const activities = await LeadActivity.find(query)
      .populate('leadId', 'leadName email companyName')
      .populate('performedBy', 'name email')
      .populate('ownerAtTime', 'name email')
      .sort({ timestamp: -1 }) // Newest first
      .limit(parseInt(limit, 10))
      .skip(parseInt(skip, 10))
      .lean();

    // Get total count for pagination
    const totalCount = await LeadActivity.countDocuments(query);

    // Format response
    const activitiesData = activities.map(activity => {
      const leadId = activity.leadId?._id ? activity.leadId._id.toString() : activity.leadId.toString();
      const performedById = activity.performedBy?._id ? activity.performedBy._id.toString() : activity.performedBy.toString();
      const ownerAtTimeId = activity.ownerAtTime?._id ? activity.ownerAtTime._id.toString() : activity.ownerAtTime.toString();

      return {
        id: activity._id.toString(),
        leadId,
        leadName: activity.leadId?.leadName || 'Unknown',
        leadEmail: activity.leadId?.email || null,
        activityType: activity.activityType,
        performedBy: {
          id: performedById,
          name: activity.performedBy?.name || 'Unknown',
          email: activity.performedBy?.email || null,
        },
        ownerAtTime: {
          id: ownerAtTimeId,
          name: activity.ownerAtTime?.name || 'Unknown',
          email: activity.ownerAtTime?.email || null,
        },
        description: activity.description || null,
        metadata: activity.metadata || {},
        timestamp: activity.timestamp,
      };
    });

    return ApiResponse.success(res, 200, 'Activities fetched successfully', {
      activities: activitiesData,
      count: activitiesData.length,
      total: totalCount,
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
    });
  } catch (error) {
    // If it's already an ApiError, let it propagate
    if (error.statusCode) {
      throw error;
    }
    // Otherwise, wrap it
    throw ApiError.internalServerError('Failed to fetch activities');
  }
};

module.exports = {
  getAllActivities,
};

