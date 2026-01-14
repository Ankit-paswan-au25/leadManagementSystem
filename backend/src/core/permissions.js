/**
 * Permission Constants
 * 
 * All permissions in the system are defined here.
 * Do NOT hardcode permission strings elsewhere.
 * 
 * Naming convention: CAN_<ACTION>_<RESOURCE>
 */

const PERMISSIONS = {
  // Lead Management
  CAN_CREATE_LEAD: 'CAN_CREATE_LEAD',
  CAN_VIEW_LEAD: 'CAN_VIEW_LEAD',
  CAN_EDIT_LEAD: 'CAN_EDIT_LEAD',
  CAN_DELETE_LEAD: 'CAN_DELETE_LEAD',
  CAN_ASSIGN_LEAD: 'CAN_ASSIGN_LEAD',
  CAN_VIEW_ALL_LEADS: 'CAN_VIEW_ALL_LEADS',
  CAN_APPROVE_OWNERSHIP: 'CAN_APPROVE_OWNERSHIP',

  // Product Management
  CAN_MANAGE_PRODUCTS: 'CAN_MANAGE_PRODUCTS',
  CAN_VIEW_PRODUCTS: 'CAN_VIEW_PRODUCTS',

  // Customer Management
  CAN_MANAGE_CUSTOMERS: 'CAN_MANAGE_CUSTOMERS',
  CAN_VIEW_CUSTOMERS: 'CAN_VIEW_CUSTOMERS',

  // Zoho Integration
  CAN_SYNC_ZOHO: 'CAN_SYNC_ZOHO',

  // LinkedIn Scraping
  CAN_SCRAPE_LINKEDIN: 'CAN_SCRAPE_LINKEDIN',

  // User Management (Admin only)
  CAN_MANAGE_USERS: 'CAN_MANAGE_USERS',
  CAN_VIEW_USERS: 'CAN_VIEW_USERS',
};

module.exports = PERMISSIONS;

