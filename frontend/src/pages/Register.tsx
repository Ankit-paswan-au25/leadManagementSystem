import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService, type ValidationErrors } from '../services/auth.service';
import SuccessAlert from '../components/alerts/SuccessAlert';
import ErrorAlert from '../components/alerts/ErrorAlert';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import axios from 'axios';

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  [key: string]: string | undefined;
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (errors.name) {
      setErrors({ ...errors, name: undefined });
    }
  };

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

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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

    authService
      .register(name.trim(), email.trim(), password)
      .then((response) => {
        setAlert({
          type: 'success',
          message: response.message || 'Registration successful! Your account is pending activation by an administrator.',
        });

        // Redirect to login after short delay
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      })
      .catch((error: unknown) => {
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

        // Handle conflict (409) - email already exists
        if (axios.isAxiosError(error) && error.response?.status === 409) {
          setErrors({
            email: 'User with this email already exists',
          });
          return;
        }

        // Handle other errors - show ErrorAlert
        const message = error instanceof Error ? error.message : 'Registration failed. Please try again.';
        setAlert({
          type: 'error',
          message,
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-secondary p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Create Account</h1>
          <p className="text-text-secondary">Sign up to get started</p>
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
            <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={handleNameChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary ${
                errors.name
                  ? 'border-error-500 focus:ring-error-500'
                  : 'border-border-default'
              }`}
              placeholder="Enter your full name"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary ${
                errors.email
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
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary ${
                errors.password
                  ? 'border-error-500 focus:ring-error-500'
                  : 'border-border-default'
              }`}
              placeholder="Enter your password (min. 6 characters)"
              disabled={isLoading}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.password}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary ${
                errors.confirmPassword
                  ? 'border-error-500 focus:ring-error-500'
                  : 'border-border-default'
              }`}
              placeholder="Confirm your password"
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.confirmPassword}</p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
            isLoading={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Register;

