const Lead = require('../models/Lead.model');
const Customer = require('../models/Customer.model');
const User = require('../models/User.model');
const ApiError = require('../core/ApiError');
const ApiResponse = require('../core/ApiResponse');
const { LEAD_STATUS, ACTIVITY_TYPE } = require('../core/leadEnums');
const { createLeadActivity } = require('../utils/leadActivityHelper');

/**
 * Convert Lead to Customer
 * POST /leads/:id/convert-to-customer
 * 
 * Access: ADMIN or USER (permission: CAN_MANAGE_CUSTOMERS or CAN_CREATE_LEAD)
 * 
 * Flow:
 * 1. Validate lead exists
 * 2. Ensure lead.status = CLOSED
 * 3. Check if customer already exists for this lead
 * 4. Create Customer
 * 5. Create LeadActivity (CUSTOMER_CREATED)
 * 6. Return customer info
 */
const convertLeadToCustomer = async (req, res) => {
  const { id: leadId } = req.params;
  const currentUser = req.user;

  // Validate lead exists
  const lead = await Lead.findById(leadId);
  if (!lead) {
    throw ApiError.notFound('Lead not found');
  }

  // Ensure lead is CLOSED
  if (lead.status !== LEAD_STATUS.CLOSED) {
    throw ApiError.badRequest('Lead must be CLOSED before conversion to customer');
  }

  // Check if customer already exists for this lead
  const existingCustomer = await Customer.findOne({ convertedFromLeadId: leadId });
  if (existingCustomer) {
    throw ApiError.conflict('Customer already exists for this lead');
  }

  // Create Customer
  const customer = new Customer({
    customerName: lead.leadName,
    companyName: lead.companyName,
    primaryEmail: lead.email,
    phone: lead.phone,
    convertedFromLeadId: lead._id,
    accountOwnerId: lead.ownerId,
    status: 'ACTIVE',
  });

  await customer.save();

  // Create LeadActivity (CUSTOMER_CREATED)
  await createLeadActivity({
    leadId: lead._id,
    activityType: ACTIVITY_TYPE.CUSTOMER_CREATED,
    performedBy: currentUser.userId,
    ownerAtTime: lead.ownerId, // Owner at the time of conversion
    lead, // Pass lead for Slack notification
    metadata: {
      customerId: customer._id.toString(),
      customerName: customer.customerName,
    },
    description: `Lead converted to customer: ${customer.customerName}`,
  });

  return ApiResponse.success(res, 201, 'Lead converted to customer successfully', {
    customer: {
      id: customer._id,
      customerName: customer.customerName,
      companyName: customer.companyName,
      primaryEmail: customer.primaryEmail,
      phone: customer.phone,
      status: customer.status,
      accountOwnerId: customer.accountOwnerId,
      convertedFromLeadId: customer.convertedFromLeadId,
    },
  });
};

/**
 * Get Customers
 * GET /customers
 * 
 * Access: ADMIN (all customers) or USER (own customers only)
 * 
 * Query params:
 * - status (optional)
 * - accountOwnerId (admin only)
 */
const getCustomers = async (req, res) => {
  const currentUser = req.user;
  const { status, accountOwnerId } = req.query;

  // Build query
  const query = {};

  // ADMIN can see all customers, USER only sees own customers
  if (currentUser.role !== 'ADMIN') {
    query.accountOwnerId = currentUser.userId;
  } else if (accountOwnerId) {
    // Admin can filter by accountOwnerId
    query.accountOwnerId = accountOwnerId;
  }

  // Filter by status if provided
  if (status) {
    query.status = status;
  }

  // Fetch customers with populated account owner information
  const customers = await Customer.find(query)
    .populate('accountOwnerId', 'name email') // Populate account owner with name and email
    .populate('convertedFromLeadId', 'leadName email') // Populate lead info
    .sort({ createdAt: -1 }) // Newest first
    .select('-__v');

  // Prepare response
  const customersData = customers.map(customer => {
    // Handle populated accountOwner (when populated, it's an object with _id and name)
    // When not populated, it's just the ObjectId
    const ownerId = customer.accountOwnerId?._id ? customer.accountOwnerId._id.toString() : customer.accountOwnerId.toString();
    const ownerName = customer.accountOwnerId?.name || 'Unknown';

    return {
      id: customer._id,
      customerName: customer.customerName,
      companyName: customer.companyName,
      primaryEmail: customer.primaryEmail,
      phone: customer.phone,
      accountOwnerId: ownerId,
      accountOwnerName: ownerName, // Match frontend type (accountOwnerName)
      convertedFromLeadId: customer.convertedFromLeadId?._id ? customer.convertedFromLeadId._id.toString() : customer.convertedFromLeadId.toString(),
      status: customer.status,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  });

  return ApiResponse.success(res, 200, 'Customers fetched successfully', {
    customers: customersData,
    count: customersData.length,
  });
};

module.exports = {
  convertLeadToCustomer,
  getCustomers,
};

