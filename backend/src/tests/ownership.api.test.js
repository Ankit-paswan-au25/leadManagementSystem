const request = require('supertest');
const app = require('../app');
const Lead = require('../models/Lead.model');
const LeadActivity = require('../models/LeadActivity.model');
const User = require('../models/User.model');
const { generateToken } = require('../utils/token');
const { ACTIVITY_TYPE } = require('../core/leadEnums');
const { createLeadActivity } = require('../utils/leadActivityHelper');

xdescribe('Ownership Approval APIs', () => {
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
      email: 'admin@ownershiptest.com',
      passwordHash: 'password123',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    await adminUser.save();
    adminToken = generateToken(adminUser);

    // Create regular user
    regularUser = new User({
      name: 'Regular User',
      email: 'user@ownershiptest.com',
      passwordHash: 'password123',
      role: 'USER',
      status: 'ACTIVE',
    });
    await regularUser.save();
    userToken = generateToken(regularUser);

    // Create another user
    anotherUser = new User({
      name: 'Another User',
      email: 'another@ownershiptest.com',
      passwordHash: 'password123',
      role: 'USER',
      status: 'ACTIVE',
    });
    await anotherUser.save();
    anotherUserToken = generateToken(anotherUser);
  });

  describe('GET /ownership/requests - List Pending Requests', () => {
    let userLead;
    let anotherUserLead;

    beforeEach(async () => {
      // Create leads
      userLead = new Lead({
        leadName: 'User Lead',
        email: 'userlead@example.com',
        ownerId: regularUser._id,
        createdBy: regularUser._id,
      });
      await userLead.save();

      anotherUserLead = new Lead({
        leadName: 'Another User Lead',
        email: 'anotherlead@example.com',
        ownerId: anotherUser._id,
        createdBy: anotherUser._id,
      });
      await anotherUserLead.save();

      // Create ownership change requests
      await createLeadActivity({
        leadId: userLead._id,
        activityType: ACTIVITY_TYPE.OWNER_CHANGE_REQUESTED,
        performedBy: regularUser._id,
        ownerAtTime: regularUser._id,
        metadata: {
          requestedOwnerId: anotherUser._id.toString(),
        },
      });

      await createLeadActivity({
        leadId: anotherUserLead._id,
        activityType: ACTIVITY_TYPE.OWNER_CHANGE_REQUESTED,
        performedBy: anotherUser._id,
        ownerAtTime: anotherUser._id,
        metadata: {
          requestedOwnerId: adminUser._id.toString(),
        },
      });
    });

    it('should return pending requests for ADMIN', async () => {
      const response = await request(app)
        .get('/api/ownership/requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('requests');
      expect(response.body.data).toHaveProperty('count', 2);
      expect(response.body.data.requests.length).toBe(2);

      // Verify request structure
      const requestData = response.body.data.requests[0];
      expect(requestData).toHaveProperty('leadId');
      expect(requestData).toHaveProperty('leadName');
      expect(requestData).toHaveProperty('leadEmail');
      expect(requestData).toHaveProperty('currentOwnerId');
      expect(requestData).toHaveProperty('requestedOwnerId');
      expect(requestData).toHaveProperty('requestedById');
      expect(requestData).toHaveProperty('requestedByName');
      expect(requestData).toHaveProperty('requestedAt');
    });

    it('should return 403 for USER (non-admin)', async () => {
      const response = await request(app)
        .get('/api/ownership/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('status', 'error');
    });

    it('should return 401 for missing token', async () => {
      await request(app)
        .get('/api/ownership/requests')
        .expect(401);
    });

    it('should exclude already processed requests', async () => {
      // Approve one request
      await request(app)
        .post(`/api/ownership/requests/${userLead._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // List requests again
      const response = await request(app)
        .get('/api/ownership/requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Should only show the unprocessed request
      expect(response.body.data.count).toBe(1);
      expect(response.body.data.requests[0].leadId).toBe(anotherUserLead._id.toString());
    });
  });

  describe('POST /ownership/requests/:leadId/approve - Approve Ownership Change', () => {
    let userLead;

    beforeEach(async () => {
      userLead = new Lead({
        leadName: 'Test Lead',
        email: 'test@example.com',
        ownerId: regularUser._id,
        createdBy: regularUser._id,
      });
      await userLead.save();

      // Create ownership change request
      await createLeadActivity({
        leadId: userLead._id,
        activityType: ACTIVITY_TYPE.OWNER_CHANGE_REQUESTED,
        performedBy: regularUser._id,
        ownerAtTime: regularUser._id,
        metadata: {
          requestedOwnerId: anotherUser._id.toString(),
        },
      });
    });

    it('should approve ownership change and update lead.ownerId', async () => {
      const response = await request(app)
        .post(`/api/ownership/requests/${userLead._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('oldOwnerId', regularUser._id.toString());
      expect(response.body.data).toHaveProperty('newOwnerId', anotherUser._id.toString());

      // Verify lead owner was updated
      const updatedLead = await Lead.findById(userLead._id);
      expect(updatedLead.ownerId.toString()).toBe(anotherUser._id.toString());
    });

    it('should create OWNER_CHANGED activity with correct ownerAtTime', async () => {
      await request(app)
        .post(`/api/ownership/requests/${userLead._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Find OWNER_CHANGED activity
      const activities = await LeadActivity.find({
        leadId: userLead._id,
        activityType: ACTIVITY_TYPE.OWNER_CHANGED,
      });

      expect(activities).toHaveLength(1);
      const activity = activities[0];
      expect(activity.ownerAtTime.toString()).toBe(regularUser._id.toString()); // Old owner
      expect(activity.performedBy.toString()).toBe(adminUser._id.toString()); // Admin approved
      expect(activity.metadata.oldOwnerId).toBe(regularUser._id.toString());
      expect(activity.metadata.newOwnerId).toBe(anotherUser._id.toString());
    });

    it('should return 404 for non-existent lead', async () => {
      const mongoose = require('mongoose');
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/ownership/requests/${fakeId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body.message).toBe('Lead not found');
    });

    it('should return 404 for lead with no pending request', async () => {
      // Create a lead without any ownership change request
      const newLead = new Lead({
        leadName: 'New Lead',
        email: 'new@example.com',
        ownerId: regularUser._id,
        createdBy: regularUser._id,
      });
      await newLead.save();

      const response = await request(app)
        .post(`/api/ownership/requests/${newLead._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body.message).toContain('No pending ownership change request');
    });

    it('should return 403 for USER (non-admin)', async () => {
      const response = await request(app)
        .post(`/api/ownership/requests/${userLead._id}/approve`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('status', 'error');
    });

    it('should not allow duplicate approvals', async () => {
      // Approve first time
      await request(app)
        .post(`/api/ownership/requests/${userLead._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Try to approve again (should fail - no pending request)
      const response = await request(app)
        .post(`/api/ownership/requests/${userLead._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.message).toContain('No pending ownership change request');
    });
  });

  describe('POST /ownership/requests/:leadId/reject - Reject Ownership Change', () => {
    let userLead;

    beforeEach(async () => {
      userLead = new Lead({
        leadName: 'Test Lead',
        email: 'test@example.com',
        ownerId: regularUser._id,
        createdBy: regularUser._id,
      });
      await userLead.save();

      // Create ownership change request
      await createLeadActivity({
        leadId: userLead._id,
        activityType: ACTIVITY_TYPE.OWNER_CHANGE_REQUESTED,
        performedBy: regularUser._id,
        ownerAtTime: regularUser._id,
        metadata: {
          requestedOwnerId: anotherUser._id.toString(),
        },
      });
    });

    it('should reject ownership change without updating lead.ownerId', async () => {
      const response = await request(app)
        .post(`/api/ownership/requests/${userLead._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Not suitable for transfer' })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('currentOwnerId', regularUser._id.toString());

      // Verify lead owner was NOT changed
      const updatedLead = await Lead.findById(userLead._id);
      expect(updatedLead.ownerId.toString()).toBe(regularUser._id.toString());
    });

    it('should create OWNER_CHANGE_REJECTED activity', async () => {
      await request(app)
        .post(`/api/ownership/requests/${userLead._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test rejection reason' })
        .expect(200);

      // Find OWNER_CHANGE_REJECTED activity
      const activities = await LeadActivity.find({
        leadId: userLead._id,
        activityType: ACTIVITY_TYPE.OWNER_CHANGE_REJECTED,
      });

      expect(activities).toHaveLength(1);
      const activity = activities[0];
      expect(activity.ownerAtTime.toString()).toBe(regularUser._id.toString()); // Current owner
      expect(activity.performedBy.toString()).toBe(adminUser._id.toString()); // Admin rejected
      expect(activity.metadata.reason).toBe('Test rejection reason');
    });

    it('should allow rejection without reason', async () => {
      const response = await request(app)
        .post(`/api/ownership/requests/${userLead._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');

      const activities = await LeadActivity.find({
        leadId: userLead._id,
        activityType: ACTIVITY_TYPE.OWNER_CHANGE_REJECTED,
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].metadata.reason).toBeNull();
    });

    it('should return 404 for non-existent lead', async () => {
      const mongoose = require('mongoose');
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/ownership/requests/${fakeId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('status', 'error');
    });

    it('should return 404 for lead with no pending request', async () => {
      const newLead = new Lead({
        leadName: 'New Lead',
        email: 'new@example.com',
        ownerId: regularUser._id,
        createdBy: regularUser._id,
      });
      await newLead.save();

      const response = await request(app)
        .post(`/api/ownership/requests/${newLead._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.message).toContain('No pending ownership change request');
    });

    it('should return 403 for USER (non-admin)', async () => {
      const response = await request(app)
        .post(`/api/ownership/requests/${userLead._id}/reject`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('status', 'error');
    });
  });

  describe('Owner Snapshot Preservation', () => {
    it('should preserve ownerAtTime correctly in OWNER_CHANGED activity', async () => {
      const lead = new Lead({
        leadName: 'Snapshot Test Lead',
        email: 'snapshot@example.com',
        ownerId: regularUser._id,
        createdBy: regularUser._id,
      });
      await lead.save();

      // Request ownership change
      await createLeadActivity({
        leadId: lead._id,
        activityType: ACTIVITY_TYPE.OWNER_CHANGE_REQUESTED,
        performedBy: regularUser._id,
        ownerAtTime: regularUser._id,
        metadata: {
          requestedOwnerId: anotherUser._id.toString(),
        },
      });

      // Approve (this changes owner)
      await request(app)
        .post(`/api/ownership/requests/${lead._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify ownerAtTime in OWNER_CHANGED = old owner (regularUser)
      const changedActivity = await LeadActivity.findOne({
        leadId: lead._id,
        activityType: ACTIVITY_TYPE.OWNER_CHANGED,
      });

      expect(changedActivity.ownerAtTime.toString()).toBe(regularUser._id.toString());
      // But current owner should be anotherUser
      const updatedLead = await Lead.findById(lead._id);
      expect(updatedLead.ownerId.toString()).toBe(anotherUser._id.toString());
    });

    it('should preserve ownerAtTime correctly in OWNER_CHANGE_REJECTED activity', async () => {
      const lead = new Lead({
        leadName: 'Reject Test Lead',
        email: 'reject@example.com',
        ownerId: regularUser._id,
        createdBy: regularUser._id,
      });
      await lead.save();

      // Request ownership change
      await createLeadActivity({
        leadId: lead._id,
        activityType: ACTIVITY_TYPE.OWNER_CHANGE_REQUESTED,
        performedBy: regularUser._id,
        ownerAtTime: regularUser._id,
        metadata: {
          requestedOwnerId: anotherUser._id.toString(),
        },
      });

      // Reject
      await request(app)
        .post(`/api/ownership/requests/${lead._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify ownerAtTime in REJECTED = current owner (regularUser)
      const rejectedActivity = await LeadActivity.findOne({
        leadId: lead._id,
        activityType: ACTIVITY_TYPE.OWNER_CHANGE_REJECTED,
      });

      expect(rejectedActivity.ownerAtTime.toString()).toBe(regularUser._id.toString());
    });
  });
});

