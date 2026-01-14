const Lead = require('../models/Lead.model');
const User = require('../models/User.model');
const LeadActivity = require('../models/LeadActivity.model');
const ApiResponse = require('../core/ApiResponse');
const ApiError = require('../core/ApiError');

/**
 * Get Dashboard Stats
 * GET /dashboard/stats
 * 
 * Access: Authenticated users (ADMIN or USER)
 * 
 * Returns dashboard statistics for the logged-in user:
 * - totalLeads: Total leads created by the user
 * - salesTarget: Sales target of the user
 * - zohoPushedCount: Number of leads pushed to Zoho by the user
 * - zohoLoggedIn: Whether user is logged into Zoho
 */
const getDashboardStats = async (req, res) => {
    const currentUser = req.user;
    const userId = currentUser.userId;

    try {
        // Get user with sales target and Zoho info
        const user = await User.findById(userId).select('salesTarget zohoLoggedIn zohoPushedCount');

        if (!user) {
            throw ApiError.notFound('User not found');
        }

        // Count total leads created by the logged-in user
        const totalLeads = await Lead.countDocuments({ createdBy: userId });

        // Get Zoho pushed count from user (or count from LeadActivity if we want to track it there)
        // For now, we'll use the user's zohoPushedCount field
        // Optionally, we could count LeadActivity records with activityType related to Zoho push
        let zohoPushedCount = user.zohoPushedCount || 0;

        // Try to get actual count from LeadActivity if available
        // Assuming we might track Zoho pushes in LeadActivity metadata
        try {
            const zohoPushActivities = await LeadActivity.countDocuments({
                performedBy: userId,
                'metadata.source': 'ZOHO',
                activityType: { $in: ['CREATED', 'UPDATED'] }, // Adjust based on your activity types
            });
            // Use the higher of the two (user field or activity count)
            if (zohoPushActivities > zohoPushedCount) {
                zohoPushedCount = zohoPushActivities;
            }
        } catch (err) {
            // If counting from LeadActivity fails, just use user field
            // This is fine - we can improve this later
        }

        const stats = {
            totalLeads,
            salesTarget: user.salesTarget || 0,
            zohoPushedCount,
            zohoLoggedIn: user.zohoLoggedIn || false,
        };

        return ApiResponse.success(res, 200, 'Dashboard stats fetched successfully', { stats });
    } catch (error) {
        // If it's already an ApiError, let it propagate
        if (error.statusCode) {
            throw error;
        }
        // Otherwise, wrap it
        throw ApiError.internalServerError('Failed to fetch dashboard stats');
    }
};

module.exports = {
    getDashboardStats,
};

