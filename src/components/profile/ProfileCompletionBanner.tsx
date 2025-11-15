/**
 * Profile Completion Banner Component
 * Displays progress and encourages users to complete their profile
 * Shows on dashboard/profile pages when profile is incomplete
 */

import React from 'react';
import { UserProfile } from '@/types/data';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProfileCompletionBannerProps {
  profile: UserProfile | null;
  onEditClick?: () => void;
  onDismiss?: () => void;
  showDismiss?: boolean;
}

export const ProfileCompletionBanner: React.FC<ProfileCompletionBannerProps> = ({
  profile,
  onEditClick,
  onDismiss,
  showDismiss = true,
}) => {
  if (!profile) {
    return null;
  }

  /**
   * Calculate profile completion percentage
   * Required fields: firstName, lastName, position, category
   * Optional fields: department, phone, bio, photo
   */
  const calculateCompletion = (): {
    percentage: number;
    completedFields: number;
    totalFields: number;
  } => {
    const fields = [
      'firstName',
      'lastName',
      'position',
      'category',
      'department',
      'phone',
      'bio',
      'photo',
    ];

    const completedFields = fields.filter((field) => {
      const value = profile[field as keyof UserProfile];
      return value && String(value).trim() !== '';
    }).length;

    return {
      percentage: Math.round((completedFields / fields.length) * 100),
      completedFields,
      totalFields: fields.length,
    };
  };

  /**
   * Get missing fields for improvement suggestions
   */
  const getMissingFields = (): string[] => {
    const missing: string[] = [];

    if (!profile.department) missing.push('Department');
    if (!profile.phone) missing.push('Phone number');
    if (!profile.bio) missing.push('Bio');
    if (!profile.photo) missing.push('Profile photo');

    return missing;
  };

  const { percentage, completedFields, totalFields } = calculateCompletion();
  const missingFields = getMissingFields();
  const isComplete = percentage === 100;

  // Only show banner if profile is less than 100% complete
  if (isComplete) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-4">
      {/* Icon */}
      <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="font-semibold text-blue-900">Complete Your Profile</h3>
          {showDismiss && onDismiss && (
            <button
              onClick={onDismiss}
              className="text-blue-600 hover:text-blue-900 p-1"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-blue-800">
              Progress: {completedFields} of {totalFields} fields
            </p>
            <p className="text-sm font-medium text-blue-900">{percentage}%</p>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Missing Fields */}
        {missingFields.length > 0 && (
          <p className="text-sm text-blue-700 mb-3">
            Add {missingFields.slice(0, 3).join(', ')}
            {missingFields.length > 3 ? `, and ${missingFields.length - 3} more` : ''} to
            complete your profile.
          </p>
        )}

        {/* Action Button */}
        {onEditClick && (
          <Button
            onClick={onEditClick}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Edit Profile
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * Completed Profile Banner
 * Shows when profile is 100% complete
 */
export const ProfileCompletedBanner: React.FC<{
  onDismiss?: () => void;
  showDismiss?: boolean;
}> = ({ onDismiss, showDismiss = true }) => {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-4">
      {/* Icon */}
      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />

      <div className="flex-1">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-green-900">Profile Complete</h3>
          {showDismiss && onDismiss && (
            <button
              onClick={onDismiss}
              className="text-green-600 hover:text-green-900 p-1"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-sm text-green-700 mt-1">
          Great! Your profile is complete and visible in the directory.
        </p>
      </div>
    </div>
  );
};
