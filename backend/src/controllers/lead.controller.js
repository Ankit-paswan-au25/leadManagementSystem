const Lead = require('../models/Lead.model');
const LeadActivity = require('../models/LeadActivity.model');
const User = require('../models/User.model');
const Schedule = require('../models/Schedule.model');
const ApiError = require('../core/ApiError');
const ApiResponse = require('../core/ApiResponse');
const { LEAD_STATUS, LEAD_SOURCE } = require('../core/leadEnums');
const { createLeadActivity } = require('../utils/leadActivityHelper');
const { createDefaultSchedule } = require('../utils/scheduleHelper');

/**
 * Create Lead
 * POST /leads
 * 
 * Access: ADMIN or USER (permission: CAN_CREATE_LEAD)
 * 
 * Flow:
 * 1. Read lead data from request
 * 2. Set ownerId (ADMIN can assign, USER becomes owner)
 * 3. Create Lead
 * 4. Create LeadActivity (CREATED)
 * 5. Return success response
 */
const createLead = async (req, res) => {
  const { leadName, companyName, email, phone, ownerId, source, productId } = req.body;
  const currentUser = req.user;

  // Validate required fields
  if (!leadName || !email) {
    const errors = {};
    if (!leadName) errors.leadName = 'Lead name is required';
    if (!email) errors.email = 'Email is required';
    throw ApiError.validationError('Validation failed', errors);
  }

  // Determine ownerId
  let finalOwnerId;
  if (currentUser.role === 'ADMIN' && ownerId) {
    // Admin can assign owner
    // Validate ObjectId format first
    if (!require('mongoose').Types.ObjectId.isValid(ownerId)) {
      throw ApiError.badRequest('Invalid owner ID format');
    }
    // Verify the assigned user exists
    const assignedUser = await User.findById(ownerId);
    if (!assignedUser) {
      throw ApiError.badRequest('Assigned owner not found');
    }
    finalOwnerId = ownerId;
  } else {
    // USER becomes owner by default, or ADMIN without ownerId specified
    finalOwnerId = currentUser.userId;
  }

  // Validate productId if provided
  if (productId && !require('mongoose').Types.ObjectId.isValid(productId)) {
    throw ApiError.badRequest('Invalid product ID format');
  }

  // Create lead
  const lead = new Lead({
    leadName,
    companyName,
    email,
    phone,
    ownerId: finalOwnerId,
    createdBy: currentUser.userId,
    status: LEAD_STATUS.NEW, // Default status, no manual override
    source: source || LEAD_SOURCE.MANUAL,
    productId: productId || null,
  });

  const savedLead = await lead.save();

  // Create LeadActivity for creation
  await createLeadActivity({
    leadId: savedLead._id,
    activityType: 'CREATED',
    performedBy: currentUser.userId,
    ownerAtTime: finalOwnerId,
    metadata: {
      source: savedLead.source,
    },
    description: `Lead created by ${currentUser.role}`,
  });

  // Auto-create default schedule for the lead
  const scheduleData = createDefaultSchedule(savedLead._id);
  const schedule = new Schedule(scheduleData);
  await schedule.save();

  // Prepare response (exclude internal fields)
  const leadData = {
    id: savedLead._id,
    leadName: savedLead.leadName,
    companyName: savedLead.companyName,
    email: savedLead.email,
    phone: savedLead.phone,
    ownerId: savedLead.ownerId,
    createdBy: savedLead.createdBy,
    status: savedLead.status,
    source: savedLead.source,
    createdAt: savedLead.createdAt,
    updatedAt: savedLead.updatedAt,
  };

  return ApiResponse.success(res, 201, 'Lead created successfully', leadData);
};

/**
 * Get Leads
 * GET /leads
 * 
 * Access: ADMIN (all leads) or USER (own leads only)
 * 
 * Query params:
 * - status (optional)
 * - ownerId (admin only)
 * - page (optional, default: 1)
 * - limit (optional, default: 10)
 */
const getLeads = async (req, res) => {
  const currentUser = req.user;
  const { status, ownerId, page = 1, limit = 10 } = req.query;

  // Build query
  const query = {};

  // ADMIN can see all leads, USER only sees own leads
  if (currentUser.role !== 'ADMIN') {
    query.ownerId = currentUser.userId;
  } else if (ownerId) {
    // Admin can filter by ownerId
    query.ownerId = ownerId;
  }

  // Filter by status if provided
  if (status) {
    query.status = status;
  }

  // Parse pagination parameters
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Get total count for pagination
  const totalCount = await Lead.countDocuments(query);

  // Fetch leads with populated owner and product information, pagination, and sorting
  const leads = await Lead.find(query)
    .populate('ownerId', 'name email') // Populate owner with name and email
    .populate('productId', 'productName productCode') // Populate product with name and code
    .sort({ createdAt: -1 }) // Newest first
    .skip(skip)
    .limit(limitNum)
    .select('-__v');

  // Prepare response
  const leadsData = leads.map(lead => {
    // Handle populated owner (when populated, it's an object with _id and name)
    // When not populated, it's just the ObjectId
    const ownerId = lead.ownerId?._id ? lead.ownerId._id.toString() : lead.ownerId.toString();
    const ownerName = lead.ownerId?.name || 'Unknown';

    // Handle populated product (when populated, it's an object with _id and productName)
    // When not populated, it's null or just the ObjectId
    const productId = lead.productId?._id ? lead.productId._id.toString() : (lead.productId ? lead.productId.toString() : null);
    const productName = lead.productId?.productName || null;
    const productCode = lead.productId?.productCode || null;

    return {
      id: lead._id,
      leadName: lead.leadName,
      companyName: lead.companyName,
      email: lead.email,
      phone: lead.phone,
      ownerId,
      ownerName,
      productId,
      productName,
      productCode,
      status: lead.status,
      source: lead.source,
      lastContactedAt: lead.lastContactedAt,
      nextFollowUpAt: lead.nextFollowUpAt,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    };
  });

  const totalPages = Math.ceil(totalCount / limitNum);

  return ApiResponse.success(res, 200, 'Leads fetched successfully', {
    leads: leadsData,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalCount,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  });
};

/**
 * Get Lead by ID
 * GET /leads/:id
 * 
 * Access: ADMIN (all leads) or USER (own leads only)
 */
const getLeadById = async (req, res) => {
  const { id } = req.params;
  const currentUser = req.user;

  // Validate ObjectId format
  if (!require('mongoose').Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid lead ID format');
  }

  // Find lead with populated owner, creator, and product
  const lead = await Lead.findById(id)
    .populate('ownerId', 'name email') // Populate owner with name and email
    .populate('createdBy', 'name email') // Populate creator with name and email
    .populate('productId', 'productName productCode') // Populate product with name and code
    .select('-__v');

  if (!lead) {
    throw ApiError.notFound('Lead not found');
  }

  // Check access: ADMIN can see all leads, USER only sees own leads
  // Handle populated ownerId (when populated, it's an object with _id)
  // Mongoose populated objects have _id property
  let leadOwnerId;
  if (lead.ownerId && typeof lead.ownerId === 'object' && lead.ownerId._id) {
    // Populated object - extract _id and convert to string
    leadOwnerId = lead.ownerId._id.toString();
  } else if (lead.ownerId) {
    // Not populated, just ObjectId - convert to string
    leadOwnerId = lead.ownerId.toString();
  } else {
    throw ApiError.internalServerError('Lead owner information is missing');
  }
  
  // Compare with current user's ID (both should be strings)
  // Ensure both are strings for comparison
  const currentUserId = String(currentUser.userId);
  const leadOwnerIdStr = String(leadOwnerId);
  
  if (currentUser.role !== 'ADMIN' && leadOwnerIdStr !== currentUserId) {
    throw ApiError.forbidden('You do not have permission to view this lead');
  }

  // Handle populated owner (when populated, it's an object with _id and name)
  // When not populated, it's just the ObjectId
  const ownerId = lead.ownerId?._id ? lead.ownerId._id.toString() : lead.ownerId.toString();
  const ownerName = lead.ownerId?.name || 'Unknown';

  // Handle populated creator (when populated, it's an object with _id and name)
  // When not populated, it's just the ObjectId
  const createdById = lead.createdBy?._id ? lead.createdBy._id.toString() : lead.createdBy.toString();
  const createdByName = lead.createdBy?.name || 'Unknown';

  // Handle populated product (when populated, it's an object with _id and productName)
  // When not populated, it's null or just the ObjectId
  const productId = lead.productId?._id ? lead.productId._id.toString() : (lead.productId ? lead.productId.toString() : null);
  const productName = lead.productId?.productName || null;
  const productCode = lead.productId?.productCode || null;

  // Prepare response
  const leadData = {
    id: lead._id,
    leadName: lead.leadName,
    companyName: lead.companyName,
    email: lead.email,
    phone: lead.phone,
    ownerId,
    ownerName,
    createdById,
    createdByName,
    productId,
    productName,
    productCode,
    status: lead.status,
    source: lead.source,
    lastContactedAt: lead.lastContactedAt,
    nextFollowUpAt: lead.nextFollowUpAt,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };

  return ApiResponse.success(res, 200, 'Lead fetched successfully', leadData);
};

/**
 * Get Lead Activities
 * GET /leads/:id/activities
 * 
 * Access: ADMIN (all leads) or USER (own leads only)
 */
const getLeadActivities = async (req, res) => {
  const { id } = req.params;
  const currentUser = req.user;

  // Validate ObjectId format
  if (!require('mongoose').Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid lead ID format');
  }

  // First, verify the lead exists and check access
  const lead = await Lead.findById(id).select('ownerId');
  
  if (!lead) {
    throw ApiError.notFound('Lead not found');
  }

  // Check access: ADMIN can see all leads, USER only sees own leads
  // Handle ownerId (might be ObjectId or populated object)
  let leadOwnerId;
  if (lead.ownerId && typeof lead.ownerId === 'object' && lead.ownerId._id) {
    // Populated object
    leadOwnerId = lead.ownerId._id.toString();
  } else {
    // Not populated, just ObjectId
    leadOwnerId = lead.ownerId.toString();
  }
  
  if (currentUser.role !== 'ADMIN' && leadOwnerId !== currentUser.userId) {
    throw ApiError.forbidden('You do not have permission to view activities for this lead');
  }

  // Fetch activities for this lead
  const activities = await LeadActivity.find({ leadId: id })
    .populate('performedBy', 'name email')
    .populate('ownerAtTime', 'name email')
    .sort({ timestamp: -1 }) // Newest first
    .lean();

  // Format response
  const activitiesData = activities.map(activity => {
    const performedById = activity.performedBy?._id ? activity.performedBy._id.toString() : activity.performedBy.toString();
    const ownerAtTimeId = activity.ownerAtTime?._id ? activity.ownerAtTime._id.toString() : activity.ownerAtTime.toString();

    return {
      id: activity._id.toString(),
      leadId: id,
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
      createdAt: activity.timestamp, // For compatibility
    };
  });

  return ApiResponse.success(res, 200, 'Lead activities fetched successfully', activitiesData);
};

/**
 * Ownership Change Request
 * POST /leads/:id/owner-change-request
 * 
 * Access: USER (permission: CAN_CREATE_LEAD)
 * 
 * Flow:
 * 1. Verify lead exists
 * 2. Verify requester is current owner
 * 3. Create LeadActivity (OWNER_CHANGE_REQUESTED)
 * 4. Do NOT change lead.ownerId yet
 * 5. Return info response
 */
const requestOwnerChange = async (req, res) => {
  const { id } = req.params;
  const { requestedOwnerId } = req.body;
  const currentUser = req.user;

  // Validate requestedOwnerId
  if (!requestedOwnerId) {
    throw ApiError.validationError('Validation failed', {
      requestedOwnerId: 'Requested owner ID is required',
    });
  }

  // Validate ObjectId format
  if (!require('mongoose').Types.ObjectId.isValid(requestedOwnerId)) {
    throw ApiError.badRequest('Invalid requested owner ID format');
  }

  // Find lead
  const lead = await Lead.findById(id);
  if (!lead) {
    throw ApiError.notFound('Lead not found');
  }

  // Verify current user is the owner
  if (lead.ownerId.toString() !== currentUser.userId) {
    throw ApiError.forbidden('Only the current owner can request ownership change');
  }

  // Verify requested owner exists
  const requestedOwner = await User.findById(requestedOwnerId);
  if (!requestedOwner) {
    throw ApiError.badRequest('Requested owner not found');
  }

  // Verify not requesting self
  if (requestedOwnerId === currentUser.userId) {
    throw ApiError.badRequest('Cannot request ownership change to yourself');
  }

  // Create LeadActivity for ownership change request
  await createLeadActivity({
    leadId: lead._id,
    activityType: 'OWNER_CHANGE_REQUESTED',
    performedBy: currentUser.userId,
    ownerAtTime: lead.ownerId, // Current owner at time of request
    lead, // Pass lead for Slack notification
    metadata: {
      requestedOwnerId,
      currentOwnerId: lead.ownerId.toString(),
    },
    description: `Ownership change requested from ${lead.ownerId} to ${requestedOwnerId}`,
  });

  return ApiResponse.success(res, 200, 'Ownership change request logged successfully', {
    leadId: lead._id,
    currentOwnerId: lead.ownerId,
    requestedOwnerId,
    message: 'Request has been logged. Approval pending.',
  });
};

/**
 * Update Lead
 * PUT /leads/:id
 * 
 * Access: ADMIN (all leads) or USER (own leads only)
 * 
 * Flow:
 * 1. Validate lead exists
 * 2. Check access (ADMIN or owner)
 * 3. Update allowed fields
 * 4. Create LeadActivity (UPDATED)
 * 5. Return updated lead
 */
const updateLead = async (req, res) => {
  const { id } = req.params;
  const { leadName, companyName, email, phone, productId, nextFollowUpAt } = req.body;
  const currentUser = req.user;

  // Validate ObjectId format
  if (!require('mongoose').Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid lead ID format');
  }

  // Find lead
  const lead = await Lead.findById(id);
  if (!lead) {
    throw ApiError.notFound('Lead not found');
  }

  // Check access: ADMIN can edit all leads, USER can only edit own leads
  let leadOwnerId;
  if (lead.ownerId && typeof lead.ownerId === 'object' && lead.ownerId._id) {
    leadOwnerId = lead.ownerId._id.toString();
  } else {
    leadOwnerId = lead.ownerId.toString();
  }

  if (currentUser.role !== 'ADMIN' && leadOwnerId !== currentUser.userId) {
    throw ApiError.forbidden('You do not have permission to edit this lead');
  }

  // Update fields if provided
  if (leadName !== undefined) {
    lead.leadName = leadName.trim();
  }
  if (companyName !== undefined) {
    lead.companyName = companyName ? companyName.trim() : null;
  }
  if (email !== undefined) {
    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      throw ApiError.validationError('Validation failed', {
        email: 'Please provide a valid email address',
      });
    }
    lead.email = email.toLowerCase().trim();
  }
  if (phone !== undefined) {
    lead.phone = phone ? phone.trim() : null;
  }
  if (productId !== undefined) {
    // Validate productId if provided
    if (productId && !require('mongoose').Types.ObjectId.isValid(productId)) {
      throw ApiError.badRequest('Invalid product ID format');
    }
    // Validate product exists if provided
    if (productId) {
      const Product = require('../models/Product.model');
      const product = await Product.findById(productId);
      if (!product) {
        throw ApiError.badRequest('Product not found');
      }
    }
    lead.productId = productId || null;
  }

  if (nextFollowUpAt !== undefined) {
    // Validate and set nextFollowUpAt
    if (nextFollowUpAt === null || nextFollowUpAt === '') {
      lead.nextFollowUpAt = null;
    } else {
      const followUpDate = new Date(nextFollowUpAt);
      if (isNaN(followUpDate.getTime())) {
        throw ApiError.validationError('Validation failed', {
          nextFollowUpAt: 'Invalid date format',
        });
      }
      lead.nextFollowUpAt = followUpDate;
    }
  }

  await lead.save();

  // Populate owner and product for response
  await lead.populate('ownerId', 'name email');
  await lead.populate('productId', 'productName productCode');
  await lead.populate('createdBy', 'name email');

  // Create LeadActivity for update
  await createLeadActivity({
    leadId: lead._id,
    activityType: 'UPDATED',
    performedBy: currentUser.userId,
    ownerAtTime: lead.ownerId,
    metadata: {
      updatedFields: Object.keys(req.body).filter(key => 
        ['leadName', 'companyName', 'email', 'phone', 'productId', 'nextFollowUpAt'].includes(key)
      ),
    },
    description: `Lead updated by ${currentUser.role}`,
  });

  // Prepare response
  const leadOwnerIdStr = lead.ownerId?._id ? lead.ownerId._id.toString() : lead.ownerId.toString();
  const leadOwnerName = lead.ownerId?.name || 'Unknown';
  const createdById = lead.createdBy?._id ? lead.createdBy._id.toString() : lead.createdBy.toString();
  const createdByName = lead.createdBy?.name || 'Unknown';
  const productIdStr = lead.productId?._id ? lead.productId._id.toString() : (lead.productId ? lead.productId.toString() : null);
  const productName = lead.productId?.productName || null;
  const productCode = lead.productId?.productCode || null;

  const leadData = {
    id: lead._id,
    leadName: lead.leadName,
    companyName: lead.companyName,
    email: lead.email,
    phone: lead.phone,
    ownerId: leadOwnerIdStr,
    ownerName: leadOwnerName,
    createdById,
    createdByName,
    productId: productIdStr,
    productName,
    productCode,
    status: lead.status,
    source: lead.source,
    nextFollowUpAt: lead.nextFollowUpAt,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };

  return ApiResponse.success(res, 200, 'Lead updated successfully', leadData);
};

module.exports = {
  createLead,
  getLeads,
  getLeadById,
  getLeadActivities,
  requestOwnerChange,
  updateLead,
};

