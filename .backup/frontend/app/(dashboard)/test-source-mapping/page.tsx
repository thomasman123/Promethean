'use client';

import { useAuth } from '@/hooks/useAuth';

export default function TestSourceMappingPage() {
  const { user, loading, getAccountBasedPermissions } = useAuth();
  const permissions = getAccountBasedPermissions();

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Source Mapping Page</h1>
      <div className="space-y-2">
        <p><strong>User:</strong> {user?.email || 'Not logged in'}</p>
        <p><strong>Loading:</strong> {loading.toString()}</p>
        <p><strong>Can Manage Account:</strong> {permissions.canManageAccount.toString()}</p>
        <p><strong>User Role:</strong> {user?.profile?.role || 'No role'}</p>
      </div>
      
      {permissions.canManageAccount ? (
        <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded">
          ✅ You have permissions to access source mapping!
        </div>
      ) : (
        <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded">
          ❌ You don't have permissions to access source mapping.
        </div>
      )}
    </div>
  );
} 