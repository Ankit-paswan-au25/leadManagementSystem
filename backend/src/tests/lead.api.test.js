const request = require('supertest');
const app = require('../app');
const Lead = require('../models/Lead.model');
const LeadActivity = require('../models/LeadActivity.model');
const Schedule = require('../models/Schedule.model');
const User = require('../models/User.model');
const { generateToken } = require('../utils/token');
const { LEAD_STATUS, LEAD_SOURCE, ACTIVITY_TYPE } = require('../core/leadEnums');

xdescribe('Lead APIs', () => {
  let adminUser;
  let regularUser;
  let anotherUser;
  let adminToken;
  let userToken;
  let anotherUserToken;

  beforeEach(async () => {
    // Create admin user
    adminUser = new User({
      name: 'Admin User',
      email: 'admin@leadtest.com',
      passwordHash: 'password123',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    await adminUser.save();
    adminToken = generateToken(adminUser);

    // Create regular user
    regularUser = new User({
      name: 'Regular User',
      email: 'user@leadtest.com',
      passwordHash: 'password123',
      role: 'USER',
      status: 'ACTIVE',
    });
    await regularUser.save();
    userToken = generateToken(regularUser);

    // Create another user
    anotherUser = new User({
      name: 'Another User',
      email: 'another@leadtest.com',
      passwordHash: 'password123',
      role: 'USER',
      status: 'ACTIVE',
    });
    await anotherUser.save();
    anotherUserToken = generateToken(anotherUser);
  });

  describe('POST /leads - Create Lead', () => {
    it('should create lead for USER (owner = self)', async () => {
      const leadData = {
        leadName: 'John Doe',
        email: 'john@example.com',
        companyName: 'Acme Corp',
        phone: '1234567890',
      };

      const response = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${userToken}`)
        .send(leadData)
        .expect(201);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Lead created successfully');
      expect(response.body.data).toHaveProperty('leadName', 'John Doe');
      expect(response.body.data).toHaveProperty('email', 'john@example.com');
      expect(response.body.data.ownerId).toBe(regularUser._id.toString());
      expect(response.body.data.createdBy).toBe(regularUser._id.toString());
      expect(response.body.data.status).toBe(LEAD_STATUS.NEW);

      // Verify LeadActivity was created
      const activities = await LeadActivity.find({ leadId: response.body.data.id });
      expect(activities).toHaveLength(1);
      expect(activities[0].activityType).toBe(ACTIVITY_TYPE.CREATED);
      expect(activities[0].performedBy.toString()).toBe(regularUser._id.toString());
      expect(activities[0].ownerAtTime.toString()).toBe(regularUser._id.toString());

      // Verify Schedule was auto-created
      const schedule = await Schedule.findOne({ leadId: response.body.data.id });
      expect(schedule).toBeDefined();
      expect(schedule.active).toBe(true);
      expect(schedule.nextRunAt).toBeDefined();
    });

    it('should create lead for ADMIN with assigned owner', async () => {
      const leadData = {
        leadName: 'Jane Doe',
        email: 'jane@example.com',
        ownerId: regularUser._id.toString(),
      };

      const response = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(leadData)
        .expect(201);

      expect(response.body.data.ownerId).toBe(regularUser._id.toString());
      expect(response.body.data.createdBy).toBe(adminUser._id.toString());

      // Verify LeadActivity
      const activities = await LeadActivity.find({ leadId: response.body.data.id });
      expect(activities).toHaveLength(1);
      expect(activities[0].ownerAtTime.toString()).toBe(regularUser._id.toString());
    });

    it('should create lead for ADMIN without ownerId (becomes owner)', async () => {
      const leadData = {
        leadName: 'Bob Smith',
        email: 'bob@example.com',
      };

      const response = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(leadData)
        .expect(201);

      expect(response.body.data.ownerId).toBe(adminUser._id.toString());
    });

    it('should return validation error for missing email', async () => {
      const leadData = {
        leadName: 'John Doe',
      };

      const response = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${userToken}`)
        .send(leadData)
        .expect(422);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveProperty('email');
    });

    it('should return validation error for missing leadName', async () => {
      const leadData = {
        email: 'john@example.com',
      };

      const response = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${userToken}`)
        .send(leadData)
        .expect(422);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body.errors).toHaveProperty('leadName');
    });

    it('should return 400 for invalid ownerId (ADMIN)', async () => {
      const leadData = {
        leadName: 'John Doe',
        email: 'john@example.com',
        ownerId: 'invalid-id',
      };

      const response = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(leadData)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .post('/api/leads')
        .send({ leadName: 'John Doe', email: 'john@example.com' })
        .expect(401);
    });

    it('should default status to NEW', async () => {
      const leadData = {
        leadName: 'John Doe',
        email: 'john@example.com',
      };

      const response = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${userToken}`)
        .send(leadData)
        .expect(201);

      expect(response.body.data.status).toBe(LEAD_STATUS.NEW);
    });

    it('should default source to MANUAL', async () => {
      const leadData = {
        leadName: 'John Doe',
        email: 'john@example.com',
      };

      const response = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${userToken}`)
        .send(leadData)
        .expect(201);

      expect(response.body.data.source).toBe(LEAD_SOURCE.MANUAL);
    });
  });

  describe('GET /leads - Get Leads', () => {
    let userLead1;
    let userLead2;
    let anotherUserLead;
    let adminLead;

    beforeEach(async () => {
      // Create leads for different users
      userLead1 = new Lead({
        leadName: 'User Lead 1',
        email: 'userlead1@example.com',
        ownerId: regularUser._id,
        createdBy: regularUser._id,
      });
      await userLead1.save();

      userLead2 = new Lead({
        leadName: 'User Lead 2',
        email: 'userlead2@example.com',
        ownerId: regularUser._id,
        createdBy: regularUser._id,
        status: LEAD_STATUS.CONTACTED,
      });
      await userLead2.save();

      anotherUserLead = new Lead({
        leadName: 'Another User Lead',
        email: 'anotherlead@example.com',
        ownerId: anotherUser._id,
        createdBy: anotherUser._id,
      });
      await anotherUserLead.save();

      adminLead = new Lead({
        leadName: 'Admin Lead',
        email: 'adminlead@example.com',
        ownerId: adminUser._id,
        createdBy: adminUser._id,
      });
      await adminLead.save();
    });

    it('should return all leads for ADMIN', async () => {
      const response = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('leads');
      expect(response.body.data.pagination).toHaveProperty('total', 4);
      expect(response.body.data.leads.length).toBe(4);
    });

    it('should return only own leads for USER', async () => {
      const response = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.pagination.total).toBe(2);
      response.body.data.leads.forEach(lead => {
        expect(lead.ownerId).toBe(regularUser._id.toString());
      });
    });

    it('should filter by status for USER', async () => {
      const response = await request(app)
        .get('/api/leads?status=CONTACTED')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.pagination.total).toBe(1);
      expect(response.body.data.leads[0].status).toBe(LEAD_STATUS.CONTACTED);
    });

    it('should filter by ownerId for ADMIN', async () => {
      const response = await request(app)
        .get(`/api/leads?ownerId=${regularUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.pagination.total).toBe(2);
      response.body.data.leads.forEach(lead => {
        expect(lead.ownerId).toBe(regularUser._id.toString());
      });
    });

    it('should return 401 for missing token', async () => {
      await request(app)
        .get('/api/leads')
        .expect(401);
    });
  });

  describe('POST /leads/:id/owner-change-request - Ownership Change Request', () => {
    let userLead;

    beforeEach(async () => {
      userLead = new Lead({
        leadName: 'Test Lead',
        email: 'test@example.com',
        ownerId: regularUser._id,
        createdBy: regularUser._id,
      });
      await userLead.save();
    });

    it('should allow current owner to request ownership change', async () => {
      const response = await request(app)
        .post(`/api/leads/${userLead._id}/owner-change-request`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ requestedOwnerId: anotherUser._id.toString() })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('currentOwnerId', regularUser._id.toString());
      expect(response.body.data).toHaveProperty('requestedOwnerId', anotherUser._id.toString());

      // Verify LeadActivity was created
      const activities = await LeadActivity.find({ leadId: userLead._id });
      expect(activities).toHaveLength(1);
      expect(activities[0].activityType).toBe(ACTIVITY_TYPE.OWNER_CHANGE_REQUESTED);
      expect(activities[0].performedBy.toString()).toBe(regularUser._id.toString());
      expect(activities[0].ownerAtTime.toString()).toBe(regularUser._id.toString());
      expect(activities[0].metadata.requestedOwnerId).toBe(anotherUser._id.toString());
    });

    it('should NOT change lead.ownerId (still current owner)', async () => {
      await request(app)
        .post(`/api/leads/${userLead._id}/owner-change-request`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ requestedOwnerId: anotherUser._id.toString() })
        .expect(200);

      // Verify ownerId hasn't changed
      const updatedLead = await Lead.findById(userLead._id);
      expect(updatedLead.ownerId.toString()).toBe(regularUser._id.toString());
    });

    it('should return 403 for non-owner requesting change', async () => {
      const response = await request(app)
        .post(`/api/leads/${userLead._id}/owner-change-request`)
        .set('Authorization', `Bearer ${anotherUserToken}`)
        .send({ requestedOwnerId: adminUser._id.toString() })
        .expect(403);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body.message).toContain('Only the current owner');
    });

    it('should return 404 for non-existent lead', async () => {
      const mongoose = require('mongoose');
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/leads/${fakeId}/owner-change-request`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ requestedOwnerId: anotherUser._id.toString() })
        .expect(404);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body.message).toBe('Lead not found');
    });

    it('should return validation error for missing requestedOwnerId', async () => {
      const response = await request(app)
        .post(`/api/leads/${userLead._id}/owner-change-request`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(422);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body.errors).toHaveProperty('requestedOwnerId');
    });

    it('should return 400 for invalid requestedOwnerId', async () => {
      const response = await request(app)
        .post(`/api/leads/${userLead._id}/owner-change-request`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ requestedOwnerId: 'invalid-id' })
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
    });

    it('should return 400 for requesting change to self', async () => {
      const response = await request(app)
        .post(`/api/leads/${userLead._id}/owner-change-request`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ requestedOwnerId: regularUser._id.toString() })
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body.message).toContain('yourself');
    });

    it('should allow multiple pending requests', async () => {
      // First request
      await request(app)
        .post(`/api/leads/${userLead._id}/owner-change-request`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ requestedOwnerId: anotherUser._id.toString() })
        .expect(200);

      // Second request (different owner)
      const adminUser2 = new User({
        name: 'Admin 2',
        email: 'admin2@test.com',
        passwordHash: 'password123',
        role: 'ADMIN',
        status: 'ACTIVE',
      });
      await adminUser2.save();

      await request(app)
        .post(`/api/leads/${userLead._id}/owner-change-request`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ requestedOwnerId: adminUser2._id.toString() })
        .expect(200);

      // Verify both activities exist
      const activities = await LeadActivity.find({
        leadId: userLead._id,
        activityType: ACTIVITY_TYPE.OWNER_CHANGE_REQUESTED,
      });
      expect(activities).toHaveLength(2);
    });
  });

  describe('Activity Logging', () => {
    it('should create CREATED activity with correct ownerAtTime', async () => {
      const leadData = {
        leadName: 'John Doe',
        email: 'john@example.com',
      };

      const response = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${userToken}`)
        .send(leadData)
        .expect(201);

      const activities = await LeadActivity.find({ leadId: response.body.data.id });
      expect(activities).toHaveLength(1);
      expect(activities[0].activityType).toBe(ACTIVITY_TYPE.CREATED);
      expect(activities[0].ownerAtTime.toString()).toBe(regularUser._id.toString());
      expect(activities[0].performedBy.toString()).toBe(regularUser._id.toString());
    });

    it('should create OWNER_CHANGE_REQUESTED activity with correct ownerAtTime', async () => {
      const lead = new Lead({
        leadName: 'Test Lead',
        email: 'test@example.com',
        ownerId: regularUser._id,
        createdBy: regularUser._id,
      });
      await lead.save();

      await request(app)
        .post(`/api/leads/${lead._id}/owner-change-request`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ requestedOwnerId: anotherUser._id.toString() })
        .expect(200);

      const activities = await LeadActivity.find({
        leadId: lead._id,
        activityType: ACTIVITY_TYPE.OWNER_CHANGE_REQUESTED,
      });
      expect(activities).toHaveLength(1);
      expect(activities[0].ownerAtTime.toString()).toBe(regularUser._id.toString());
      expect(activities[0].performedBy.toString()).toBe(regularUser._id.toString());
    });
  });
});

