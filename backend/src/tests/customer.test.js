const Customer = require('../models/Customer.model');
const Lead = require('../models/Lead.model');
const User = require('../models/User.model');
const LeadActivity = require('../models/LeadActivity.model');
const { LEAD_STATUS, ACTIVITY_TYPE } = require('../core/leadEnums');

describe('Customer Model', () => {
  let testUser;
  let testLead;

  beforeEach(async () => {
    // Create test user
    testUser = new User({
      name: 'Test User',
      email: 'customertest@test.com',
      passwordHash: 'password123',
      role: 'USER',
      status: 'ACTIVE',
    });
    await testUser.save();

    // Create test lead
    testLead = new Lead({
      leadName: 'John Doe',
      companyName: 'Acme Corp',
      email: 'john@acme.com',
      ownerId: testUser._id,
      createdBy: testUser._id,
      status: LEAD_STATUS.CLOSED, // Must be CLOSED for conversion
    });
    await testLead.save();
  });

  describe('Schema Validation', () => {
    it('should create customer with valid data', async () => {
      const customer = new Customer({
        customerName: 'John Doe',
        companyName: 'Acme Corp',
        primaryEmail: 'john@acme.com',
        convertedFromLeadId: testLead._id,
        accountOwnerId: testUser._id,
        status: 'ACTIVE',
      });

      await customer.save();

      expect(customer._id).toBeDefined();
      expect(customer.customerName).toBe('John Doe');
      expect(customer.primaryEmail).toBe('john@acme.com');
      expect(customer.convertedFromLeadId.toString()).toBe(testLead._id.toString());
    });

    it('should require customerName', async () => {
      const customer = new Customer({
        companyName: 'Acme Corp',
        primaryEmail: 'john@acme.com',
        convertedFromLeadId: testLead._id,
        accountOwnerId: testUser._id,
      });

      await expect(customer.save()).rejects.toThrow();
    });

    it('should require primaryEmail', async () => {
      const customer = new Customer({
        customerName: 'John Doe',
        convertedFromLeadId: testLead._id,
        accountOwnerId: testUser._id,
      });

      await expect(customer.save()).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const customer = new Customer({
        customerName: 'John Doe',
        primaryEmail: 'invalid-email',
        convertedFromLeadId: testLead._id,
        accountOwnerId: testUser._id,
      });

      await expect(customer.save()).rejects.toThrow();
    });

    it('should enforce unique convertedFromLeadId', async () => {
      const customer1 = new Customer({
        customerName: 'John Doe',
        primaryEmail: 'john@acme.com',
        convertedFromLeadId: testLead._id,
        accountOwnerId: testUser._id,
      });
      await customer1.save();

      const customer2 = new Customer({
        customerName: 'Jane Doe',
        primaryEmail: 'jane@acme.com',
        convertedFromLeadId: testLead._id, // Same lead
        accountOwnerId: testUser._id,
      });

      await expect(customer2.save()).rejects.toThrow();
    });
  });

  describe('Deletion Prevention', () => {
    it('should prevent customer deletion', async () => {
      const customer = new Customer({
        customerName: 'John Doe',
        primaryEmail: 'john@acme.com',
        convertedFromLeadId: testLead._id,
        accountOwnerId: testUser._id,
      });
      await customer.save();

      await expect(Customer.deleteOne({ _id: customer._id })).rejects.toThrow();
    });
  });
});

describe('Customer Conversion API', () => {
  let testUser;
  let testLead;
  let app;
  let request;

  beforeEach(async () => {
    // Create test user
    testUser = new User({
      name: 'Test User',
      email: 'convert@test.com',
      passwordHash: 'password123',
      role: 'USER',
      status: 'ACTIVE',
    });
    await testUser.save();

    // Create test lead
    testLead = new Lead({
      leadName: 'John Doe',
      companyName: 'Acme Corp',
      email: 'john@acme.com',
      ownerId: testUser._id,
      createdBy: testUser._id,
      status: LEAD_STATUS.CLOSED,
    });
    await testLead.save();

    // Setup app
    app = require('../app');
    request = require('supertest')(app);
  });

  it('should convert lead to customer successfully', async () => {
    const token = require('../utils/token').generateToken(testUser);

    const response = await request
      .post(`/leads/${testLead._id}/convert-to-customer`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(response.body.status).toBe('success');
    expect(response.body.data.customer).toBeDefined();
    expect(response.body.data.customer.customerName).toBe('John Doe');
    expect(response.body.data.customer.primaryEmail).toBe('john@acme.com');

    // Verify customer exists
    const Customer = require('../models/Customer.model');
    const customer = await Customer.findOne({ convertedFromLeadId: testLead._id });
    expect(customer).toBeDefined();

    // Verify LeadActivity created
    const activity = await LeadActivity.findOne({
      leadId: testLead._id,
      activityType: ACTIVITY_TYPE.CUSTOMER_CREATED,
    });
    expect(activity).toBeDefined();
    expect(activity.ownerAtTime.toString()).toBe(testUser._id.toString());
  });

  it('should return 400 if lead is not CLOSED', async () => {
    const openLead = new Lead({
      leadName: 'Open Lead',
      companyName: 'Test Corp',
      email: 'open@test.com',
      ownerId: testUser._id,
      createdBy: testUser._id,
      status: LEAD_STATUS.NEW,
    });
    await openLead.save();

    const token = require('../utils/token').generateToken(testUser);

    await request
      .post(`/leads/${openLead._id}/convert-to-customer`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('should return 409 if customer already exists for lead', async () => {
    const Customer = require('../models/Customer.model');
    const customer = new Customer({
      customerName: 'John Doe',
      primaryEmail: 'john@acme.com',
      convertedFromLeadId: testLead._id,
      accountOwnerId: testUser._id,
    });
    await customer.save();

    const token = require('../utils/token').generateToken(testUser);

    await request
      .post(`/leads/${testLead._id}/convert-to-customer`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
  });

  it('should return 404 if lead not found', async () => {
    const fakeId = new (require('mongoose').Types.ObjectId)();
    const token = require('../utils/token').generateToken(testUser);

    await request
      .post(`/leads/${fakeId}/convert-to-customer`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});

