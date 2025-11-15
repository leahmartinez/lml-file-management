import { useState, useCallback, Suspense, lazy } from 'react';
import React from 'react';
import { useAuth, User } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usersApi, ApiUser } from '@/services/apiService';
import { toast } from '@/components/ui/use-toast';
import { Pencil, Trash2, CheckCircle, Ban, Clock, Loader2 } from 'lucide-react';
import { useApproveUserMutation, useSuspendUserMutation, useDeleteUserMutation } from '@/hooks/useQueryHooks';

// Lazy load EditUserModal - only loaded when user clicks Edit button
const EditUserModal = lazy(() => import('./EditUserModal'));

const UserTable = () => {
  const { allUsers, user: currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // React Query mutations for user operations - automatically handle loading and cache updates
  const approveMutation = useApproveUserMutation();
  const suspendMutation = useSuspendUserMutation();
  const deleteMutation = useDeleteUserMutation();

  const handleDeleteUser = (email: string) => {
    // Prevent deleting yourself
    if (currentUser?.email === email) {
      toast({
        title: "Error",
        description: "You cannot delete your own account",
        variant: "destructive",
      });
      return;
    }

    setUserToDelete(email);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      await deleteMutation.mutateAsync(userToDelete);
      toast({
        title: "Success",
        description: `User "${userToDelete}" has been deleted successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  // Memoize utility functions to prevent recreating on every render
  const getRoleBadgeVariant = useCallback((role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'national_manager':
        return 'default';
      case 'site_manager':
        return 'secondary';
      default:
        return 'outline';
    }
  }, []);

  const formatRole = useCallback((role: string) => {
    return role.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }, []);

  const getStatusBadge = useCallback((status?: string, emailVerified?: boolean) => {
    if (!emailVerified) {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
          <Clock className="h-3 w-3 mr-1" />
          Email Not Verified
        </Badge>
      );
    }

    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
            <Clock className="h-3 w-3 mr-1" />
            Pending Approval
          </Badge>
        );
      case 'active':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'suspended':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
            <Ban className="h-3 w-3 mr-1" />
            Suspended
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
    }
  }, []);

  const handleApproveUser = async (email: string) => {
    try {
      await approveMutation.mutateAsync(email);
      toast({
        title: "Success",
        description: `User "${email}" has been approved and can now log in`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve user",
        variant: "destructive",
      });
    }
  };

  const handleSuspendUser = async (email: string) => {
    try {
      await suspendMutation.mutateAsync(email);
      toast({
        title: "Success",
        description: `User "${email}" has been suspended`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to suspend user",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage user accounts, permissions, and site access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No users found. Create your first user below.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sites</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map((user) => (
                    <TableRow key={user.email}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={getRoleBadgeVariant(user.role)} className="whitespace-nowrap">
                          {formatRole(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {getStatusBadge(user.accountStatus, user.emailVerified)}
                      </TableCell>
                      <TableCell>
                        {user.role === 'admin' || user.role === 'national_manager' ? (
                          <span className="text-muted-foreground text-sm">All sites</span>
                        ) : user.sites.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.sites.slice(0, 2).map((site) => (
                              <Badge key={site} variant="outline" className="text-xs">
                                {site}
                              </Badge>
                            ))}
                            {user.sites.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{user.sites.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No sites</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* Show Approve button for pending users */}
                          {user.emailVerified && user.accountStatus === 'pending' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApproveUser(user.email)}
                              className="bg-green-600 hover:bg-green-700"
                              disabled={approveMutation.isPending}
                            >
                              {approveMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  Approving...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                          )}

                          {/* Show Suspend button for active users */}
                          {user.accountStatus === 'active' && currentUser?.email !== user.email && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSuspendUser(user.email)}
                              className="border-red-300 text-red-700 hover:bg-red-50"
                              disabled={suspendMutation.isPending}
                            >
                              {suspendMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  Suspending...
                                </>
                              ) : (
                                <>
                                  <Ban className="h-4 w-4 mr-1" />
                                  Suspend
                                </>
                              )}
                            </Button>
                          )}

                          {/* Show Activate button for suspended users */}
                          {user.accountStatus === 'suspended' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApproveUser(user.email)}
                              className="border-green-300 text-green-700 hover:bg-green-50"
                              disabled={approveMutation.isPending}
                            >
                              {approveMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  Activating...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Activate
                                </>
                              )}
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user.email)}
                            disabled={currentUser?.email === user.email || deleteMutation.isPending}
                          >
                            {deleteMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isModalOpen && selectedUser && (
        <Suspense fallback={null}>
          <EditUserModal user={selectedUser} onClose={handleCloseModal} />
        </Suspense>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account
              <strong> "{userToDelete}"</strong> and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Wrap UserTable in React.memo to prevent unnecessary re-renders
// Memoization prevents re-renders when parent component updates but allUsers and other props haven't changed
export default React.memo(UserTable);
