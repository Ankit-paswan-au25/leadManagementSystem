import { authService, type UserRole, type LoginResponse, type User } from '../services/auth.service';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const ROLE_KEY = 'auth_role';
const EMAIL_KEY = 'auth_email';
const USER_KEY = 'auth_user';

class AuthStore {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private role: UserRole | null = null;
  private email: string | null = null;
  private user: User | null = null;
  private isRefreshing: boolean = false;

  constructor() {
    this.restoreSession();
  }

  /**
   * Load auth data from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem(TOKEN_KEY);
      this.refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      this.role = localStorage.getItem(ROLE_KEY) as UserRole | null;
      this.email = localStorage.getItem(EMAIL_KEY);
      
      const userStr = localStorage.getItem(USER_KEY);
      if (userStr) {
        try {
          this.user = JSON.parse(userStr);
        } catch {
          this.user = null;
        }
      }
    }
  }

  /**
   * Save auth data to localStorage
   */
  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      if (this.token) {
        localStorage.setItem(TOKEN_KEY, this.token);
      }
      if (this.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, this.refreshToken);
      }
      if (this.role) {
        localStorage.setItem(ROLE_KEY, this.role);
      }
      if (this.email) {
        localStorage.setItem(EMAIL_KEY, this.email);
      }
      if (this.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(this.user));
      }
    }
  }

  /**
   * Clear auth data from localStorage
   */
  private clearStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(ROLE_KEY);
      localStorage.removeItem(EMAIL_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }

  /**
   * Check if user is authenticated
   */
  get isAuthenticated(): boolean {
    return !!this.token && !!this.role;
  }

  /**
   * Get current user role
   */
  get currentRole(): UserRole | null {
    return this.role;
  }

  /**
   * Get current user email
   */
  get currentEmail(): string | null {
    return this.email;
  }

  /**
   * Get current user
   */
  get currentUser(): User | null {
    return this.user;
  }

  /**
   * Get auth token (access token)
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /**
   * Set authentication data
   * @param token Access token
   * @param refreshToken Refresh token (optional)
   * @param role User role
   * @param user User object
   */
  setAuth(token: string, role: UserRole, user: User, refreshToken?: string): void {
    this.token = token;
    this.refreshToken = refreshToken || null;
    this.role = role;
    this.email = user.email;
    this.user = user;
    this.saveToStorage();
  }

  /**
   * Update tokens (for refresh flow)
   * @param token New access token
   * @param refreshToken New refresh token (optional)
   */
  updateTokens(token: string, refreshToken?: string): void {
    this.token = token;
    if (refreshToken !== undefined) {
      this.refreshToken = refreshToken;
    }
    this.saveToStorage();
  }

  /**
   * Restore session from localStorage on app boot
   * This is synchronous - actual refresh happens in silentRestoreSession()
   */
  restoreSession(): void {
    this.loadFromStorage();
    
    // Validate that all required fields are present
    if (this.token && this.role && this.email) {
      // Session restored successfully
      // If user object is missing, create a minimal one
      if (!this.user) {
        this.user = {
          id: '',
          email: this.email,
          role: this.role,
        };
      }
    } else {
      // Clear incomplete session data
      this.clearStorage();
      this.token = null;
      this.refreshToken = null;
      this.role = null;
      this.email = null;
      this.user = null;
    }
  }

  /**
   * Silently restore session by attempting refresh token
   * Called on app boot if refreshToken exists
   * @returns Promise<boolean> - true if session restored, false otherwise
   */
  async silentRestoreSession(): Promise<boolean> {
    // Only attempt if we have a refresh token but no access token
    // or if we want to refresh an existing session
    if (!this.refreshToken) {
      return false;
    }

    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing) {
      return false;
    }

    try {
      this.isRefreshing = true;
      const response = await authService.refreshToken(this.refreshToken);
      
      // Update tokens and user data
      this.updateTokens(response.token, response.refreshToken);
      if (response.user) {
        this.setAuth(response.token, response.role, response.user, response.refreshToken);
      }
      
      return true;
    } catch (error) {
      // Refresh failed - clear session
      this.logout();
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Refresh session using refresh token
   * Used by httpClient interceptor when access token expires
   * @returns Promise<boolean> - true if refresh succeeded, false otherwise
   */
  async refreshSession(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing) {
      // Wait for existing refresh to complete
      // Simple approach: return false and let the interceptor handle retry
      return false;
    }

    try {
      this.isRefreshing = true;
      const response = await authService.refreshToken(this.refreshToken);
      
      // Update tokens
      this.updateTokens(response.token, response.refreshToken);
      
      return true;
    } catch (error) {
      // Refresh failed - logout user
      this.logout();
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await authService.login(email, password);
    
    // Store refresh token if provided
    const refreshToken = (response as any).refreshToken;
    this.setAuth(response.token, response.role, response.user, refreshToken);
    
    return response;
  }

  /**
   * Logout user
   */
  logout(): void {
    this.token = null;
    this.refreshToken = null;
    this.role = null;
    this.email = null;
    this.user = null;
    this.isRefreshing = false;
    this.clearStorage();
  }

  /**
   * Check if user has required role
   */
  hasRole(requiredRole: UserRole | UserRole[]): boolean {
    if (!this.role) return false;
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(this.role);
    }
    
    return this.role === requiredRole;
  }
}

// Export singleton instance
export const authStore = new AuthStore();
