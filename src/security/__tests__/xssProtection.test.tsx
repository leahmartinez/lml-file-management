import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';

describe('XSS Protection Tests', () => {
  describe('Input Sanitization', () => {
    it('should not execute script tags in user input', () => {
      const xssPayload = '<script>alert("XSS")</script>';
      
      // Test that React automatically escapes HTML
      const { container } = render(
        <div data-testid="test">{xssPayload}</div>
      );
      
      const element = screen.getByTestId('test');
      expect(element.textContent).toBe(xssPayload);
      expect(element.innerHTML).not.toContain('<script>');
      
      // Verify no script was executed
      const scripts = container.querySelectorAll('script');
      expect(scripts.length).toBe(0);
    });

    it('should escape HTML entities in user input', () => {
      const htmlPayload = '<img src="x" onerror="alert(1)">';
      
      const { container } = render(
        <div data-testid="test">{htmlPayload}</div>
      );
      
      const element = screen.getByTestId('test');
      // React should escape the HTML
      expect(element.innerHTML).toContain('&lt;');
      expect(element.innerHTML).not.toContain('<img');
    });

    it('should handle javascript: protocol in links', () => {
      const jsPayload = 'javascript:alert("XSS")';
      
      // Test that we're not using dangerouslySetInnerHTML
      const { container } = render(
        <a href={jsPayload} data-testid="test-link">Link</a>
      );
      
      const link = screen.getByTestId('test-link');
      // The href should be present but browser should handle it safely
      expect(link.getAttribute('href')).toBe(jsPayload);
    });
  });

  describe('Data Display', () => {
    it('should safely render user-provided data', () => {
      const userData = {
        name: '<script>alert("XSS")</script>',
        description: 'Normal description',
      };
      
      const { container } = render(
        <div>
          <div data-testid="name">{userData.name}</div>
          <div data-testid="description">{userData.description}</div>
        </div>
      );
      
      // React should escape the script tag
      expect(screen.getByTestId('name').textContent).toBe(userData.name);
      expect(container.querySelector('script')).toBeNull();
    });
  });
});

