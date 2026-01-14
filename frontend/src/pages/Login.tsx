import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authStore } from '../store/auth.store';
import SuccessAlert from '../components/alerts/SuccessAlert';
import ErrorAlert from '../components/alerts/ErrorAlert';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import axios, { AxiosError } from 'axios';
import type { ValidationErrors } from '../services/auth.service';

interface FormErrors {
  email?: string;
  password?: string;
  [key: string]: string | undefined;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (authStore.isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors({ ...errors, email: undefined });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (errors.password) {
      setErrors({ ...errors, password: undefined });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setAlert(null);
    setErrors({});

    // Use authStore.login which will call authService
    // Errors are handled here since we need to show validation errors inline
    console.log('Starting login...');
    authStore
      .login(email, password)
      .then((response) => {
        console.log('Login successful, response:', response);
        // Auth state is set synchronously in authStore.login via setAuth()
        // Verify it's actually set
        if (!authStore.isAuthenticated) {
          console.error('Auth state not set after login:', {
            token: authStore.getToken(),
            role: authStore.currentRole,
          });
          setAlert({
            type: 'error',
            message: 'Authentication failed. Please try again.',
          });
          setIsLoading(false);
          return;
        }

        console.log('Auth state verified, redirecting...');
        // Immediately redirect - don't show alert as we're redirecting
        // Use window.location.replace for reliable redirect (doesn't add to history)
        const dashboardUrl = window.location.origin + '/dashboard';
        console.log('Redirecting to:', dashboardUrl);
        window.location.replace(dashboardUrl);
      })
      .catch((error: unknown) => {
        console.error('Login error:', error);
        // Handle validation errors (422) - show inline
        if (axios.isAxiosError(error) && error.response?.status === 422) {
          const validationErrors = (error.response.data as any)?.errors as ValidationErrors | undefined;

          if (validationErrors) {
            // Map backend validation errors to form errors
            const formErrors: FormErrors = {};
            Object.keys(validationErrors).forEach((key) => {
              formErrors[key] = validationErrors[key];
            });
            setErrors(formErrors);
            return; // Don't show generic ErrorAlert for validation errors
          }
        }

        // Handle other errors - show ErrorAlert
        let message = 'Login failed. Please try again.';
        // Check for axios error structure (works with both real AxiosError and mock objects)
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as any;
          if (axiosError.response?.data?.message) {
            message = axiosError.response.data.message;
          } else if (axiosError.message) {
            message = axiosError.message;
          }
        } else if (error instanceof Error) {
          message = error.message;
        }
        setAlert({
          type: 'error',
          message,
        });
        setIsLoading(false);
      });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-secondary p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Welcome Back</h1>
          <p className="text-text-secondary">Sign in to your account</p>
        </div>

        {alert && (
          <div className="mb-4">
            {alert.type === 'error' ? (
              <ErrorAlert message={alert.message} onClose={() => setAlert(null)} />
            ) : (
              <SuccessAlert message={alert.message} onClose={() => setAlert(null)} />
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary ${errors.email
                ? 'border-error-500 focus:ring-error-500'
                : 'border-border-default'
                }`}
              placeholder="Enter your email"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary ${errors.password
                ? 'border-error-500 focus:ring-error-500'
                : 'border-border-default'
                }`}
              placeholder="Enter your password"
              disabled={isLoading}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
            isLoading={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-text-secondary">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Login;
