import React from 'react';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import UserTable from '@/components/admin/UserTable';
import AddUserForm from '@/components/admin/AddUserForm';
import { Shield } from 'lucide-react';

const AdminPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Admin Portal</h1>
            <p className="text-muted-foreground">Manage users, permissions, and site access</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <UserTable />
          <AddUserForm />
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
