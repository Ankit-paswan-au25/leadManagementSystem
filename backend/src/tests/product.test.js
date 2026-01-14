const Product = require('../models/Product.model');
const Customer = require('../models/Customer.model');
const CustomerProduct = require('../models/CustomerProduct.model');
const Lead = require('../models/Lead.model');
const User = require('../models/User.model');
const LeadActivity = require('../models/LeadActivity.model');
const { LEAD_STATUS, ACTIVITY_TYPE } = require('../core/leadEnums');

describe('Product Model', () => {
  describe('Schema Validation', () => {
    it('should create product with valid data', async () => {
      const product = new Product({
        productName: 'Premium Plan',
        productCode: 'PREMIUM',
        description: 'Premium subscription plan',
        category: 'Subscription',
        durationType: 'MONTHS',
        defaultDuration: 12,
        isActive: true,
      });

      await product.save();

      expect(product._id).toBeDefined();
      expect(product.productName).toBe('Premium Plan');
      expect(product.productCode).toBe('PREMIUM');
      expect(product.durationType).toBe('MONTHS');
    });

    it('should require productName', async () => {
      const product = new Product({
        productCode: 'TEST',
      });

      await expect(product.save()).rejects.toThrow();
    });

    it('should require productCode', async () => {
      const product = new Product({
        productName: 'Test Product',
      });

      await expect(product.save()).rejects.toThrow();
    });

    it('should enforce unique productCode', async () => {
      const product1 = new Product({
        productName: 'Product 1',
        productCode: 'PROD1',
      });
      await product1.save();

      const product2 = new Product({
        productName: 'Product 2',
        productCode: 'PROD1', // Duplicate
      });

      await expect(product2.save()).rejects.toThrow();
    });

    it('should uppercase productCode', async () => {
      const product = new Product({
        productName: 'Test Product',
        productCode: 'test-code',
      });
      await product.save();

      expect(product.productCode).toBe('TEST-CODE');
    });
  });

  describe('Deletion Prevention', () => {
    it('should prevent product deletion', async () => {
      const product = new Product({
        productName: 'Test Product',
        productCode: 'TEST',
      });
      await product.save();

      await expect(Product.deleteOne({ _id: product._id })).rejects.toThrow();
    });
  });
});

describe('CustomerProduct Model', () => {
  let testUser;
  let testCustomer;
  let testProduct;

  beforeEach(async () => {
    // Create test user
    testUser = new User({
      name: 'Test User',
      email: 'producttest@test.com',
      passwordHash: 'password123',
      role: 'USER',
      status: 'ACTIVE',
    });
    await testUser.save();

    // Create test lead
    const testLead = new Lead({
      leadName: 'John Doe',
      companyName: 'Acme Corp',
      email: 'john@acme.com',
      ownerId: testUser._id,
      createdBy: testUser._id,
      status: LEAD_STATUS.CLOSED,
    });
    await testLead.save();

    // Create test customer
    testCustomer = new Customer({
      customerName: 'John Doe',
      companyName: 'Acme Corp',
      primaryEmail: 'john@acme.com',
      convertedFromLeadId: testLead._id,
      accountOwnerId: testUser._id,
    });
    await testCustomer.save();

    // Create test product
    testProduct = new Product({
      productName: 'Premium Plan',
      productCode: 'PREMIUM',
      durationType: 'MONTHS',
      defaultDuration: 12,
    });
    await testProduct.save();
  });

  describe('Schema Validation', () => {
    it('should create CustomerProduct with valid data', async () => {
      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 12);

      const customerProduct = new CustomerProduct({
        customerId: testCustomer._id,
        productId: testProduct._id,
        startDate,
        expiryDate,
        status: 'ACTIVE',
        assignedBy: testUser._id,
        source: 'MANUAL',
      });

      await customerProduct.save();

      expect(customerProduct._id).toBeDefined();
      expect(customerProduct.status).toBe('ACTIVE');
    });

    it('should require customerId', async () => {
      const customerProduct = new CustomerProduct({
        productId: testProduct._id,
        assignedBy: testUser._id,
      });

      await expect(customerProduct.save()).rejects.toThrow();
    });

    it('should require productId', async () => {
      const customerProduct = new CustomerProduct({
        customerId: testCustomer._id,
        assignedBy: testUser._id,
      });

      await expect(customerProduct.save()).rejects.toThrow();
    });
  });

  describe('Deletion Prevention', () => {
    it('should prevent CustomerProduct deletion', async () => {
      const customerProduct = new CustomerProduct({
        customerId: testCustomer._id,
        productId: testProduct._id,
        assignedBy: testUser._id,
      });
      await customerProduct.save();

      await expect(CustomerProduct.deleteOne({ _id: customerProduct._id })).rejects.toThrow();
    });
  });
});

describe('Product Assignment API', () => {
  let testUser;
  let testAdmin;
  let testCustomer;
  let testProduct;
  let app;
  let request;

  beforeEach(async () => {
    // Create test user
    testUser = new User({
      name: 'Test User',
      email: 'assign@test.com',
      passwordHash: 'password123',
      role: 'USER',
      status: 'ACTIVE',
    });
    await testUser.save();

    // Create test admin
    testAdmin = new User({
      name: 'Admin User',
      email: 'admin@test.com',
      passwordHash: 'password123',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    await testAdmin.save();

    // Create test lead
    const testLead = new Lead({
      leadName: 'John Doe',
      companyName: 'Acme Corp',
      email: 'john@acme.com',
      ownerId: testUser._id,
      createdBy: testUser._id,
      status: LEAD_STATUS.CLOSED,
    });
    await testLead.save();

    // Create test customer
    testCustomer = new Customer({
      customerName: 'John Doe',
      companyName: 'Acme Corp',
      primaryEmail: 'john@acme.com',
      convertedFromLeadId: testLead._id,
      accountOwnerId: testUser._id,
    });
    await testCustomer.save();

    // Create test product
    testProduct = new Product({
      productName: 'Premium Plan',
      productCode: 'PREMIUM',
      durationType: 'MONTHS',
      defaultDuration: 12,
    });
    await testProduct.save();

    // Setup app
    app = require('../app');
    request = require('supertest')(app);
  });

  it('should assign product to customer successfully', async () => {
    const token = require('../utils/token').generateToken(testAdmin);

    const response = await request
      .post(`/api/customers/${testCustomer._id}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: testProduct._id.toString(),
        source: 'MANUAL',
      })
      .expect(201);

    expect(response.body.status).toBe('success');
    expect(response.body.data.customerProduct).toBeDefined();
    expect(response.body.data.customerProduct.status).toBe('ACTIVE');

    // Verify CustomerProduct exists
    const customerProduct = await CustomerProduct.findOne({
      customerId: testCustomer._id,
      productId: testProduct._id,
    });
    expect(customerProduct).toBeDefined();
    expect(customerProduct.expiryDate).toBeDefined();

    // Verify expiry date is calculated correctly (12 months from start)
    const expectedExpiry = new Date(customerProduct.startDate);
    expectedExpiry.setMonth(expectedExpiry.getMonth() + 12);
    expect(customerProduct.expiryDate.getTime()).toBeCloseTo(expectedExpiry.getTime(), -3); // Within 1 second

    // Verify LeadActivity created
    const Lead = require('../models/Lead.model');
    const lead = await Lead.findById(testCustomer.convertedFromLeadId);
    const activity = await LeadActivity.findOne({
      leadId: lead._id,
      activityType: ACTIVITY_TYPE.PRODUCT_ASSIGNED,
    });
    expect(activity).toBeDefined();
  });

  it('should calculate expiry for DAYS duration', async () => {
    const dailyProduct = new Product({
      productName: 'Daily Plan',
      productCode: 'DAILY',
      durationType: 'DAYS',
      defaultDuration: 30,
    });
    await dailyProduct.save();

    const token = require('../utils/token').generateToken(testAdmin);

    await request
      .post(`/api/customers/${testCustomer._id}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: dailyProduct._id.toString(),
      })
      .expect(201);

    const customerProduct = await CustomerProduct.findOne({
      customerId: testCustomer._id,
      productId: dailyProduct._id,
    });

    const expectedExpiry = new Date(customerProduct.startDate);
    expectedExpiry.setDate(expectedExpiry.getDate() + 30);
    expect(customerProduct.expiryDate.getTime()).toBeCloseTo(expectedExpiry.getTime(), -3);
  });

  it('should calculate expiry for YEARS duration', async () => {
    const yearlyProduct = new Product({
      productName: 'Yearly Plan',
      productCode: 'YEARLY',
      durationType: 'YEARS',
      defaultDuration: 2,
    });
    await yearlyProduct.save();

    const token = require('../utils/token').generateToken(testAdmin);

    await request
      .post(`/api/customers/${testCustomer._id}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: yearlyProduct._id.toString(),
      })
      .expect(201);

    const customerProduct = await CustomerProduct.findOne({
      customerId: testCustomer._id,
      productId: yearlyProduct._id,
    });

    const expectedExpiry = new Date(customerProduct.startDate);
    expectedExpiry.setFullYear(expectedExpiry.getFullYear() + 2);
    expect(customerProduct.expiryDate.getTime()).toBeCloseTo(expectedExpiry.getTime(), -3);
  });

  it('should allow NONE duration type (no expiry)', async () => {
    const noExpiryProduct = new Product({
      productName: 'Lifetime Plan',
      productCode: 'LIFETIME',
      durationType: 'NONE',
    });
    await noExpiryProduct.save();

    const token = require('../utils/token').generateToken(testAdmin);

    const response = await request
      .post(`/api/customers/${testCustomer._id}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: noExpiryProduct._id.toString(),
      })
      .expect(201);

    const customerProduct = await CustomerProduct.findOne({
      customerId: testCustomer._id,
      productId: noExpiryProduct._id,
    });

    expect(customerProduct.expiryDate).toBeNull();
  });

  it('should return 403 for non-admin user', async () => {
    const token = require('../utils/token').generateToken(testUser);

    await request
      .post(`/api/customers/${testCustomer._id}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: testProduct._id.toString(),
      })
      .expect(403);
  });

  it('should return 404 if customer not found', async () => {
    const fakeId = new (require('mongoose').Types.ObjectId)();
    const token = require('../utils/token').generateToken(testAdmin);

    await request
      .post(`/customers/${fakeId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: testProduct._id.toString(),
      })
      .expect(404);
  });

  it('should return 404 if product not found', async () => {
    const fakeId = new (require('mongoose').Types.ObjectId)();
    const token = require('../utils/token').generateToken(testAdmin);

    await request
      .post(`/api/customers/${testCustomer._id}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: fakeId.toString(),
      })
      .expect(404);
  });

  it('should return 400 if product is not active', async () => {
    testProduct.isActive = false;
    await testProduct.save();

    const token = require('../utils/token').generateToken(testAdmin);

    await request
      .post(`/api/customers/${testCustomer._id}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: testProduct._id.toString(),
      })
      .expect(400);
  });
});

