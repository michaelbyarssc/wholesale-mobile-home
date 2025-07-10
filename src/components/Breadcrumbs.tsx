import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
  isActive?: boolean;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = "" }) => {
  const location = useLocation();

  // Auto-generate breadcrumbs if not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', path: '/' }
    ];

    // Build breadcrumbs from path segments
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Create readable labels from path segments
      let label = segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Special cases for known routes
      if (segment === 'auth') label = 'Login / Register';
      if (segment === 'faq') label = 'FAQ';
      if (segment === 'home' && pathSegments[index + 1]) label = 'Mobile Home Details';
      if (segment === 'estimates') label = 'My Estimates';
      if (segment === 'appointments') label = 'My Appointments';
      if (segment === 'estimate-form') label = 'Get Estimate';
      if (segment === 'admin') label = 'Admin Dashboard';
      
      breadcrumbs.push({
        label,
        path: currentPath,
        isActive: index === pathSegments.length - 1
      });
    });

    return breadcrumbs;
  };

  const breadcrumbItems = items || generateBreadcrumbs();

  // Don't show breadcrumbs on home page
  if (location.pathname === '/') {
    return null;
  }

  return (
    <nav 
      className={`flex items-center space-x-1 text-sm text-gray-600 py-2 ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-1">
        {breadcrumbItems.map((item, index) => (
          <li key={item.path} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
            )}
            
            {item.isActive ? (
              <span className="text-gray-900 font-medium" aria-current="page">
                {index === 0 && <Home className="h-4 w-4 mr-1 inline" />}
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="text-gray-600 hover:text-blue-600 transition-colors duration-200 flex items-center"
              >
                {index === 0 && <Home className="h-4 w-4 mr-1" />}
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};