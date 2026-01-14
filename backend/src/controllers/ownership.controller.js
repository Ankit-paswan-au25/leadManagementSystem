const Lead = require('../models/Lead.model');
const LeadActivity = require('../models/LeadActivity.model');
const User = require('../models/User.model');
const ApiError = require('../core/ApiError');
const ApiResponse = require('../core/ApiResponse');
const { ACTIVITY_TYPE } = require('../core/leadEnums');
const { createLeadActivity } = require('../utils/leadActivityHelper');

/**
 * List Pending Ownership Requests
 * GET /ownership/requests
 * 
 * Access: ADMIN only (permission: CAN_APPROVE_OWNERSHIP)
 * 
 * Returns all pending ownership change requests.
 * A request is pending if:
 * - activityType = OWNER_CHANGE_REQUESTED
 * - No corresponding OWNER_CHANGED or OWNER_CHANGE_REJECTED after it
 */
const listPendingRequests = async (req, res) => {
  const currentUser = req.user;

  // Get all OWNER_CHANGE_REQUESTED activities, sorted by timestamp (newest first)
  const requestedActivities = await LeadActivity.find({
    activityType: ACTIVITY_TYPE.OWNER_CHANGE_REQUESTED,
  })
    .sort({ timestamp: -1 })
    .populate('leadId', 'leadName email ownerId')
    .populate('performedBy', 'name email')
    .populate('ownerAtTime', 'name email');

  // Get all users for populating owner names
  const allUsers = await User.find({ status: 'ACTIVE' }).select('_id name email');
  const userMap = new Map();
  allUsers.forEach(user => {
    userMap.set(user._id.toString(), { name: user.name, email: user.email });
  });

  // Filter to get only pending requests (no OWNER_CHANGED or REJECTED after)
  const pendingRequests = [];

  for (const requestActivity of requestedActivities) {
    const leadId = requestActivity.leadId._id
      ? requestActivity.leadId._id.toString()
      : requestActivity.leadId.toString();

    // Check if there's any OWNER_CHANGED or OWNER_CHANGE_REJECTED after this request
    const laterActivity = await LeadActivity.findOne({
      leadId,
      activityType: {
        $in: [ACTIVITY_TYPE.OWNER_CHANGED, ACTIVITY_TYPE.OWNER_CHANGE_REJECTED],
      },
      timestamp: { $gt: requestActivity.timestamp },
    });

    // If no later activity, this request is still pending
    if (!laterActivity) {
      // Get current lead to verify current owner
      const lead = await Lead.findById(leadId).populate('ownerId', 'name email');
      if (lead) {
        const requestedOwnerId = requestActivity.metadata?.requestedOwnerId;

        // Get current owner info
        const currentOwnerId = lead.ownerId._id ? lead.ownerId._id.toString() : lead.ownerId.toString();
        // Use populated owner name if available, otherwise fall back to userMap
        const currentOwnerInfo = lead.ownerId.name
          ? { name: lead.ownerId.name, email: lead.ownerId.email || null }
          : (userMap.get(currentOwnerId) || { name: 'Unknown', email: null });

        // Get requested owner info
        const requestedOwnerInfo = requestedOwnerId ? (userMap.get(requestedOwnerId.toString()) || { name: 'Unknown', email: null }) : { name: 'Unknown', email: null };

        // Get requested by info
        const requestedById = requestActivity.performedBy._id
          ? requestActivity.performedBy._id.toString()
          : requestActivity.performedBy.toString();
        const requestedByInfo = requestActivity.performedBy.name
          ? { name: requestActivity.performedBy.name, email: requestActivity.performedBy.email || null }
          : (userMap.get(requestedById) || { name: 'Unknown', email: null });

        pendingRequests.push({
          id: requestActivity._id.toString(), // Use activity ID as the request ID
          leadId: lead._id.toString(),
          leadName: lead.leadName,
          leadEmail: lead.email,
          currentOwnerId,
          currentOwnerName: currentOwnerInfo.name,
          requestedOwnerId: requestedOwnerId ? requestedOwnerId.toString() : null,
          requestedOwnerName: requestedOwnerInfo.name,
          requestedById,
          requestedByName: requestedByInfo.name,
          requestedAt: requestActivity.timestamp,
          status: 'PENDING',
          activityId: requestActivity._id.toString(),
        });
      }
    }
  }

  return ApiResponse.success(res, 200, 'Pending ownership requests fetched successfully', {
    requests: pendingRequests,
    count: pendingRequests.length,
  });
};

/**
 * Approve Ownership Change
 * POST /ownership/requests/:leadId/approve
 * 
 * Access: ADMIN only (permission: CAN_APPROVE_OWNERSHIP)
 * 
 * Flow:
 * 1. Validate lead exists
 * 2. Find latest pending OWNER_CHANGE_REQUESTED activity
 * 3. Update Lead.ownerId = requestedOwnerId
 * 4. Create LeadActivity (OWNER_CHANGED)
 * 5. Return success response
 */
const approveOwnershipChange = async (req, res) => {
  const { leadId } = req.params;
  const currentUser = req.user;

  // Validate lead exists
  const lead = await Lead.findById(leadId);
  if (!lead) {
    throw ApiError.notFound('Lead not found');
  }

  // Find latest pending OWNER_CHANGE_REQUESTED activity for this lead
  const requestedActivities = await LeadActivity.find({
    leadId,
    activityType: ACTIVITY_TYPE.OWNER_CHANGE_REQUESTED,
  }).sort({ timestamp: -1 });

  if (requestedActivities.length === 0) {
    throw ApiError.notFound('No pending ownership change request found for this lead');
  }

  // Find the latest request that hasn't been processed
  let pendingRequest = null;
  for (const requestActivity of requestedActivities) {
    // Check if there's any OWNER_CHANGED or OWNER_CHANGE_REJECTED after this request
    const laterActivity = await LeadActivity.findOne({
      leadId,
      activityType: {
        $in: [ACTIVITY_TYPE.OWNER_CHANGED, ACTIVITY_TYPE.OWNER_CHANGE_REJECTED],
      },
      timestamp: { $gt: requestActivity.timestamp },
    });

    if (!laterActivity) {
      pendingRequest = requestActivity;
      break;
    }
  }

  if (!pendingRequest) {
    throw ApiError.notFound('No pending ownership change request found for this lead');
  }

  const requestedOwnerId = pendingRequest.metadata?.requestedOwnerId;
  if (!requestedOwnerId) {
    throw ApiError.badRequest('Invalid ownership change request: missing requestedOwnerId');
  }

  // Validate requested owner exists
  const User = require('../models/User.model');
  const requestedOwner = await User.findById(requestedOwnerId);
  if (!requestedOwner) {
    throw ApiError.badRequest('Requested owner not found');
  }

  // Store old owner before update
  const oldOwnerId = lead.ownerId.toString();

  // Update lead owner
  lead.ownerId = requestedOwnerId;
  await lead.save();

  // Create LeadActivity for ownership change
  await createLeadActivity({
    leadId: lead._id,
    activityType: ACTIVITY_TYPE.OWNER_CHANGED,
    performedBy: currentUser.userId,
    ownerAtTime: oldOwnerId, // Owner at the time of this action (old owner)
    lead, // Pass lead object for Slack notification
    oldOwnerId, // For Slack targeting
    newOwnerId: requestedOwnerId.toString(), // For Slack targeting
    metadata: {
      oldOwnerId,
      newOwnerId: requestedOwnerId.toString(),
      approvedBy: currentUser.userId,
    },
    description: `Ownership changed from ${oldOwnerId} to ${requestedOwnerId} by admin`,
  });

  return ApiResponse.success(res, 200, 'Ownership change approved successfully', {
    leadId: lead._id.toString(),
    oldOwnerId,
    newOwnerId: requestedOwnerId.toString(),
    approvedBy: currentUser.userId,
  });
};

/**
 * Reject Ownership Change
 * POST /ownership/requests/:leadId/reject
 * 
 * Access: ADMIN only (permission: CAN_APPROVE_OWNERSHIP)
 * 
 * Flow:
 * 1. Validate pending request exists
 * 2. Create LeadActivity (OWNER_CHANGE_REJECTED)
 * 3. Do NOT change Lead.ownerId
 * 4. Return info response
 */
const rejectOwnershipChange = async (req, res) => {
  const { leadId } = req.params;
  const { reason } = req.body;
  const currentUser = req.user;

  // Validate lead exists
  const lead = await Lead.findById(leadId);
  if (!lead) {
    throw ApiError.notFound('Lead not found');
  }

  // Find latest pending OWNER_CHANGE_REQUESTED activity for this lead
  const requestedActivities = await LeadActivity.find({
    leadId,
    activityType: ACTIVITY_TYPE.OWNER_CHANGE_REQUESTED,
  }).sort({ timestamp: -1 });

  if (requestedActivities.length === 0) {
    throw ApiError.notFound('No pending ownership change request found for this lead');
  }

  // Find the latest request that hasn't been processed
  let pendingRequest = null;
  for (const requestActivity of requestedActivities) {
    // Check if there's any OWNER_CHANGED or OWNER_CHANGE_REJECTED after this request
    const laterActivity = await LeadActivity.findOne({
      leadId,
      activityType: {
        $in: [ACTIVITY_TYPE.OWNER_CHANGED, ACTIVITY_TYPE.OWNER_CHANGE_REJECTED],
      },
      timestamp: { $gt: requestActivity.timestamp },
    });

    if (!laterActivity) {
      pendingRequest = requestActivity;
      break;
    }
  }

  if (!pendingRequest) {
    throw ApiError.notFound('No pending ownership change request found for this lead');
  }

  const requestedOwnerId = pendingRequest.metadata?.requestedOwnerId;
  const currentOwnerId = lead.ownerId.toString();

  // Create LeadActivity for rejection
  await createLeadActivity({
    leadId: lead._id,
    activityType: ACTIVITY_TYPE.OWNER_CHANGE_REJECTED,
    performedBy: currentUser.userId,
    ownerAtTime: currentOwnerId, // Current owner at time of rejection
    metadata: {
      requestedOwnerId: requestedOwnerId || 'unknown',
      currentOwnerId,
      rejectedBy: currentUser.userId,
      reason: reason || null,
    },
    description: reason
      ? `Ownership change request rejected: ${reason}`
      : 'Ownership change request rejected by admin',
  });

  return ApiResponse.success(res, 200, 'Ownership change request rejected', {
    leadId: lead._id.toString(),
    currentOwnerId,
    requestedOwnerId: requestedOwnerId || 'unknown',
    rejectedBy: currentUser.userId,
    reason: reason || null,
  });
};

module.exports = {
  listPendingRequests,
  approveOwnershipChange,
  rejectOwnershipChange,
};

