/**
 * Mention Autocomplete Component
 * Dropdown for selecting users to mention in comments
 */

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

export interface MentionableUser {
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
}

interface MentionAutocompleteProps {
  isOpen: boolean;
  searchText: string;
  onSearchChange: (text: string) => void;
  availableUsers: MentionableUser[];
  onSelectUser: (user: MentionableUser) => void;
  onClose: () => void;
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  isOpen,
  searchText,
  onSearchChange,
  availableUsers,
  onSelectUser,
  onClose,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter users based on search text
  const filteredUsers = useMemo(() => {
    if (!searchText.trim()) return availableUsers;

    const lowerSearch = searchText.toLowerCase();
    return availableUsers.filter(
      user =>
        user.name.toLowerCase().includes(lowerSearch) ||
        user.firstName?.toLowerCase().includes(lowerSearch) ||
        user.lastName?.toLowerCase().includes(lowerSearch) ||
        user.email.toLowerCase().includes(lowerSearch)
    );
  }, [searchText, availableUsers]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="rounded-lg shadow-lg p-0 w-80 z-50"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
        }}
      >
        <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>Mention a person</h3>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          onClick={onClose}
          title="Close"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Search Input */}
      <div
        className="px-4 py-3"
        style={{
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4" style={{ color: '#9ca3af' }} />
          <Input
            placeholder="Search by name or email..."
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm"
            style={{
              backgroundColor: '#ffffff',
              borderColor: '#e5e7eb',
            }}
            autoFocus
          />
        </div>
      </div>

      {/* User List */}
      <div className="max-h-60 overflow-y-auto">
        {filteredUsers.length > 0 ? (
          <div className="space-y-0.5 p-2">
            {filteredUsers.map((user) => (
              <button
                key={user.email}
                onClick={() => {
                  onSelectUser(user);
                  onClose();
                  onSearchChange('');
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '0.375rem',
                  transition: 'background-color 150ms ease',
                  backgroundColor: '#ffffff',
                  color: '#111827',
                  border: 'none',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f3f4f6';
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ffffff';
                }}
              >
                <div style={{ fontWeight: '500', fontSize: '0.875rem', color: '#111827' }}>{user.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{user.email}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm" style={{ color: '#6b7280' }}>
            {searchText ? 'No users found' : 'No users available'}
          </div>
        )}
      </div>
    </div>
  );
};

MentionAutocomplete.displayName = 'MentionAutocomplete';
