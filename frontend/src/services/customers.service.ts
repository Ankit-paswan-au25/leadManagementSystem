import { get } from './httpClient';
import type { Customer, CustomerProduct } from '../types/customer.types';

/**
 * Customer Service
 * Handles API calls for customer management
 */
export const customersService = {
  /**
   * Get all customers
   * @returns Array of customers
   */
  async getCustomers(): Promise<Customer[]> {
    const response = await get<any>('/customers');

    const backendResponse = response as any;
    const isSuccess = backendResponse.status === 'success' || response.success === true;

    if (!isSuccess) {
      throw new Error(response.message || backendResponse.message || 'Failed to fetch customers');
    }

    const data = backendResponse.data || response.data;

    if (data && typeof data === 'object' && 'customers' in data && Array.isArray(data.customers)) {
      return data.customers;
    }

    if (Array.isArray(data)) {
      return data;
    }

    console.error('Invalid response format - Full response:', JSON.stringify(response, null, 2));
    throw new Error(`Invalid response format from server. Expected customers array but got: ${JSON.stringify(response).substring(0, 200)}`);
  },

  /**
   * Get a single customer by ID
   * @param id Customer ID
   * @returns Customer data
   */
  async getCustomerById(id: string): Promise<Customer> {
    const response = await get<Customer>(`/customers/${id}`);

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch customer');
    }

    return response.data;
  },

  /**
   * Get products assigned to a customer
   * @param id Customer ID
   * @returns Array of customer products
   */
  async getCustomerProducts(id: string): Promise<CustomerProduct[]> {
    const response = await get<CustomerProduct[]>(`/customers/${id}/products`);

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch customer products');
    }

    return response.data;
  },
};
