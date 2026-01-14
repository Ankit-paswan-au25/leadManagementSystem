import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';

// Mock child components
jest.mock('../components/layout/Sidebar', () => {
  return function MockSidebar() {
    return <div data-testid="sidebar">Sidebar</div>;
  };
});

jest.mock('../components/layout/TopNavbar', () => {
  return function MockTopNavbar() {
    return <div data-testid="top-navbar">TopNavbar</div>;
  };
});

// Mock Outlet
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div data-testid="outlet">Outlet Content</div>,
}));

const TestPage: React.FC = () => <div>Test Page Content</div>;

describe('AppLayout', () => {
  it('renders sidebar', () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('renders top navbar', () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('top-navbar')).toBeInTheDocument();
  });

  it('renders outlet for nested routes', () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  it('has correct layout structure', () => {
    const { container } = render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );
    
    // Check for flex layout
    const mainContainer = container.firstChild;
    expect(mainContainer).toHaveClass('flex', 'h-screen');
  });
});

