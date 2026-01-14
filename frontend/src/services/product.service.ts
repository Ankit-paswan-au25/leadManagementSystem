import { get } from './httpClient';
import type { ApiResponse } from './httpClient';

export interface Product {
  id: string;
  productName: string;
  productCode: string;
  description?: string;
  category?: string;
  durationType: 'DAYS' | 'MONTHS' | 'YEARS' | 'NONE';
  defaultDuration?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Product Service
 * Handles API calls for product management
 */
export const productService = {
  /**
   * Get all active products
   * @returns Array of products
   */
  async getProducts(): Promise<Product[]> {
    // Backend returns { status: 'success', data: { products: [...], count: ... } }
    const response = await get<any>('/products');

    // Handle backend format: { status: 'success', data: { products: [...], count: ... } }
    const backendResponse = response as any;
    const isSuccess = backendResponse.status === 'success' || response.success === true;
    
    if (!isSuccess) {
      throw new Error(response.message || backendResponse.message || 'Failed to fetch products');
    }

    // Extract products array from the nested structure
    const data = backendResponse.data || response.data;
    
    // If data has 'products' property, extract it
    if (data && typeof data === 'object' && 'products' in data && Array.isArray(data.products)) {
      return data.products;
    }
    
    // Fallback: if data is directly the array
    if (Array.isArray(data)) {
      return data;
    }
    
    // Fallback: if response itself is the data object with products
    if (backendResponse.products && Array.isArray(backendResponse.products)) {
      return backendResponse.products;
    }
    
    // If we get here, something is wrong with the response structure
    console.error('Invalid response format - Full response:', JSON.stringify(response, null, 2));
    throw new Error('Invalid response format from server');
  },
};
