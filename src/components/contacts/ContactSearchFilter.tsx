/**
 * Contact Search and Filter Component
 * Provides search and category filtering
 */

import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, LayoutGrid, List } from 'lucide-react';

export interface ContactFiltersState {
  search: string;
  category?: string;
}

interface ContactSearchFilterProps {
  categories: string[];
  onFiltersChange: (filters: ContactFiltersState) => void;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  loading?: boolean;
  resultCount?: number;
}

export const ContactSearchFilter: React.FC<ContactSearchFilterProps> = ({
  categories,
  onFiltersChange,
  onViewModeChange,
  loading = false,
  resultCount = 0,
}) => {
  const [filters, setFilters] = useState<ContactFiltersState>({
    search: '',
    category: undefined,
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  /**
   * Handle search input change with debounce
   */
  const handleSearchChange = useCallback(
    (value: string) => {
      setFilters((prev) => {
        const newFilters = { ...prev, search: value };
        onFiltersChange(newFilters);
        return newFilters;
      });
    },
    [onFiltersChange]
  );

  /**
   * Handle category filter change
   */
  const handleCategoryChange = (value: string) => {
    setFilters((prev) => {
      const newFilters = {
        ...prev,
        category: value === 'all' ? undefined : value,
      };
      onFiltersChange(newFilters);
      return newFilters;
    });
  };

  /**
   * Handle view mode change
   */
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  };

  /**
   * Clear all filters
   */
  const handleClearFilters = () => {
    const emptyFilters: ContactFiltersState = {
      search: '',
      category: undefined,
    };
    setFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters = filters.search.trim() !== '' || filters.category !== undefined;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search contacts by name, email, or position..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          disabled={loading}
          className="pl-10"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Category Filter */}
        <div className="flex-1">
          <Select value={filters.category || 'all'} onValueChange={handleCategoryChange}>
            <SelectTrigger disabled={loading}>
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 border rounded-md p-1 bg-muted">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleViewModeChange('grid')}
            title="Grid view"
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Grid</span>
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleViewModeChange('list')}
            title="List view"
            className="gap-2"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">List</span>
          </Button>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            disabled={loading}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Results Summary */}
      {resultCount > 0 && (
        <div className="text-sm text-muted-foreground">
          Found <span className="font-semibold text-foreground">{resultCount}</span> contact
          {resultCount !== 1 ? 's' : ''}
          {hasActiveFilters && ' matching your filters'}
        </div>
      )}
    </div>
  );
};
