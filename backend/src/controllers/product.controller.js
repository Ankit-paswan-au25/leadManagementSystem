const Customer = require('../models/Customer.model');
const Product = require('../models/Product.model');
const CustomerProduct = require('../models/CustomerProduct.model');
const ApiError = require('../core/ApiError');
const ApiResponse = require('../core/ApiResponse');
const { ACTIVITY_TYPE } = require('../core/leadEnums');
const { createLeadActivity } = require('../utils/leadActivityHelper');

/**
 * Get All Products
 * GET /products
 * 
 * Access: ADMIN or USER (all authenticated users can view products)
 * 
 * Returns all active products
 */
const getProducts = async (req, res) => {
  // Fetch all active products
  const products = await Product.find({ isActive: true })
    .sort({ productName: 1 }) // Sort alphabetically
    .select('-__v');

  // Prepare response
  const productsData = products.map(product => ({
    id: product._id,
    productName: product.productName,
    productCode: product.productCode,
    description: product.description,
    category: product.category,
    durationType: product.durationType,
    defaultDuration: product.defaultDuration,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }));

  return ApiResponse.success(res, 200, 'Products fetched successfully', {
    products: productsData,
    count: productsData.length,
  });
};

/**
 * Assign Product to Customer
 * POST /customers/:id/products
 * 
 * Access: ADMIN only (permission: CAN_MANAGE_PRODUCTS)
 * 
 * Flow:
 * 1. Validate customer & product exist
 * 2. Calculate expiryDate using product duration
 * 3. Create CustomerProduct
 * 4. Log LeadActivity (if from lead context) OR CustomerActivity (optional)
 * 5. Return success
 */
const assignProductToCustomer = async (req, res) => {
  const { id: customerId } = req.params;
  const { productId, startDate, source } = req.body;
  const currentUser = req.user;

  // Validate required fields
  if (!productId) {
    throw ApiError.validationError('Validation failed', {
      productId: 'Product ID is required',
    });
  }

  // Validate customer exists
  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw ApiError.notFound('Customer not found');
  }

  // Validate product exists and is active
  const product = await Product.findById(productId);
  if (!product) {
    throw ApiError.notFound('Product not found');
  }
  if (!product.isActive) {
    throw ApiError.badRequest('Product is not active');
  }

  // Calculate expiry date based on product duration
  const assignmentStartDate = startDate ? new Date(startDate) : new Date();
  let expiryDate = null;

  if (product.durationType !== 'NONE' && product.defaultDuration) {
    expiryDate = new Date(assignmentStartDate);

    switch (product.durationType) {
      case 'DAYS':
        expiryDate.setDate(expiryDate.getDate() + product.defaultDuration);
        break;
      case 'MONTHS':
        expiryDate.setMonth(expiryDate.getMonth() + product.defaultDuration);
        break;
      case 'YEARS':
        expiryDate.setFullYear(expiryDate.getFullYear() + product.defaultDuration);
        break;
      default:
        // NONE - no expiry
        expiryDate = null;
    }
  }

  // Validate expiry date if required
  if (product.durationType !== 'NONE' && !expiryDate) {
    throw ApiError.badRequest('Expiry date calculation failed. Product must have defaultDuration.');
  }

  // Create CustomerProduct
  const customerProduct = new CustomerProduct({
    customerId: customer._id,
    productId: product._id,
    startDate: assignmentStartDate,
    expiryDate,
    status: 'ACTIVE',
    assignedBy: currentUser.userId,
    source: source || 'MANUAL',
  });

  await customerProduct.save();

  // Log LeadActivity if customer was converted from a lead
  if (customer.convertedFromLeadId) {
    const Lead = require('../models/Lead.model');
    const lead = await Lead.findById(customer.convertedFromLeadId);
    
    if (lead) {
      await createLeadActivity({
        leadId: lead._id,
        activityType: ACTIVITY_TYPE.PRODUCT_ASSIGNED,
        performedBy: currentUser.userId,
        ownerAtTime: customer.accountOwnerId, // Owner at the time of assignment
        lead, // Pass lead for Slack notification
        metadata: {
          customerId: customer._id.toString(),
          productId: product._id.toString(),
          productName: product.productName,
          productCode: product.productCode,
          startDate: assignmentStartDate.toISOString(),
          expiryDate: expiryDate ? expiryDate.toISOString() : null,
        },
        description: `Product ${product.productName} (${product.productCode}) assigned to customer ${customer.customerName}`,
      });
    }
  }

  return ApiResponse.success(res, 201, 'Product assigned to customer successfully', {
    customerProduct: {
      id: customerProduct._id,
      customerId: customerProduct.customerId,
      productId: customerProduct.productId,
      startDate: customerProduct.startDate,
      expiryDate: customerProduct.expiryDate,
      status: customerProduct.status,
      source: customerProduct.source,
    },
  });
};

module.exports = {
  getProducts,
  assignProductToCustomer,
};

