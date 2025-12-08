/**
 * Mention Autocomplete Component
 * Dropdown for selecting users to mention in comments
 */

import React, { useMemo } from 'react';
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
    <div className="fixed z-50 bg-popover border border-border rounded-lg shadow-md p-0 w-80">
      {/* Header */}
      <div className="border-b border-border p-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Mention a person</h3>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={onClose}
          title="Close"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm"
            autoFocus
          />
        </div>
      </div>

      {/* User List */}
      <div className="max-h-60 overflow-y-auto">
        {filteredUsers.length > 0 ? (
          <div className="space-y-1 p-2">
            {filteredUsers.map((user) => (
              <button
                key={user.email}
                onClick={() => {
                  onSelectUser(user);
                  onClose();
                  onSearchChange('');
                }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors text-sm"
              >
                <div className="font-medium">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {searchText ? 'No users found' : 'No users available'}
          </div>
        )}
      </div>
    </div>
  );
};

MentionAutocomplete.displayName = 'MentionAutocomplete';
