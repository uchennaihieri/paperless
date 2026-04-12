"use client";

import { useState, useMemo } from "react";
import { Search, Plus, Trash2, Power, Shield, Activity, X, User as UserIcon, Edit2 } from "lucide-react";
import { updateUserRoleStatus, removeUserRole, addUserRole, updateUserInformation } from "@/app/actions/team";

// I will build a nice UI. 

export default function TeamsClientPage({ users, branches }: { users: any[], branches: string[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  
  const [userForm, setUserForm] = useState({
    user_name: "",
    finca_email: "",
    employee_id: "",
    login_id: "",
    user_no: "",
    user_role: "",
    branch: branches[0] || "",
  });

  // New role form state
  const [newRole, setNewRole] = useState({
    user_role: "",
    branch: branches[0] || "",
  });

  const availableRoles = [
    "Administrator",
    "Branch Manager",
    "Teller",
    "Operations",
    "Loan Officer",
    "Customer Service"
  ]; // Standard roles or we can input manually

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const search = searchTerm.toLowerCase();
      return (
        (user.user_name || "").toLowerCase().includes(search) ||
        (user.employee_id || "").toLowerCase().includes(search) ||
        (user.email || "").toLowerCase().includes(search)
      );
    });
  }, [users, searchTerm]);

  // If selectedUser is updated, we need to refresh its roles from the main users list
  const activeUser = selectedUser 
    ? users.find(u => u.key === selectedUser.key) 
    : null;

  const [errorModal, setErrorModal] = useState<{isOpen: boolean, message: string}>({isOpen: false, message: ""});

  const showError = (message: string) => {
    setErrorModal({ isOpen: true, message });
  };

  const handleToggleStatus = async (roleId: number, currentStatus: string, currentLockFlag: boolean) => {
    try {
      setIsLoading(true);
      const isCurrentlyActive = currentStatus?.toLowerCase() === 'active' && !currentLockFlag;
      const newStatus = isCurrentlyActive ? 'inactive' : 'active';
      const newLockFlag = isCurrentlyActive ? true : false;
      await updateUserRoleStatus(roleId, newStatus, newLockFlag);
      // Wait for revalidatePath
    } catch (e: any) {
      showError(e.message || "Failed to update role status");
    } finally {
      setIsLoading(false);
    }
  };

  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, roleId: number | null}>({isOpen: false, roleId: null});

  const handleRemoveRole = (roleId: number) => {
    setDeleteModal({ isOpen: true, roleId });
  };

  const confirmRemoveRole = async () => {
    if (!deleteModal.roleId) return;
    try {
      setIsLoading(true);
      await removeUserRole(deleteModal.roleId);
      setDeleteModal({ isOpen: false, roleId: null });
    } catch (e: any) {
      showError(e.message || "Failed to remove role");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;
    
    try {
      setIsLoading(true);
      await addUserRole({
        user_name: activeUser.user_name || "",
        finca_email: activeUser.email || "",
        employee_id: activeUser.employee_id || "",
        login_id: activeUser.login_id || "",
        user_no: activeUser.user_no || "",
        user_role: newRole.user_role,
        branch: newRole.branch,
      });
      setIsAddingRole(false);
      setNewRole({ user_role: "", branch: branches[0] || "" });
    } catch (e: any) {
      showError(e.message || "Failed to add role");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await addUserRole(userForm);
      setIsCreatingUser(false);
      setUserForm({
        user_name: "", finca_email: "", employee_id: "", login_id: "", user_no: "", user_role: "", branch: branches[0] || ""
      });
    } catch(e: any) {
      showError(e.message || "Failed to create user");
    } finally {
      setIsLoading(false);
    }
  };

  const openEditUser = () => {
    if (!activeUser) return;
    setUserForm({
      user_name: activeUser.user_name || "",
      finca_email: activeUser.email || "",
      employee_id: activeUser.employee_id || "",
      login_id: activeUser.login_id || "",
      user_no: activeUser.user_no || "",
      user_role: "", branch: ""
    });
    setIsEditingUser(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;
    try {
      setIsLoading(true);
      const rowIds = activeUser.roles.map((r: any) => r.id);
      await updateUserInformation(rowIds, {
        user_name: userForm.user_name,
        finca_email: userForm.finca_email,
        employee_id: userForm.employee_id,
        login_id: userForm.login_id,
        user_no: userForm.user_no,
      });
      setIsEditingUser(false);
    } catch(e: any) {
      showError(e.message || "Failed to update user");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Teams Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage users, their roles, and branches.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
            />
          </div>
          <button
            onClick={() => setIsCreatingUser(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> New User
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col h-[700px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50 shrink-0">
            <h3 className="font-semibold text-gray-700">Distinct Users</h3>
            <div className="text-xs text-gray-500 mt-1">{filteredUsers.length} users found</div>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {filteredUsers.map((u) => (
              <button
                key={u.key}
                onClick={() => {
                  setSelectedUser(u);
                  setIsAddingRole(false);
                }}
                className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
                  selectedUser?.key === u.key
                    ? "bg-primary/10 border-primary/20"
                    : "hover:bg-gray-50 border-transparent border"
                }`}
              >
                <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 shrink-0">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div className="hidden sm:block flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {u.user_name || "Unknown Name"}
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-0.5">
                    {u.employee_id ? `EMP: ${u.employee_id}` : u.email || String(u.key)}
                  </div>
                </div>
                <div className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full shrink-0">
                  {u.roles.length} roles
                </div>
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center py-10 text-gray-500 text-sm">
                No users found.
              </div>
            )}
          </div>
        </div>

        {/* User Details & Roles */}
        <div className="lg:col-span-2">
          {activeUser ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold uppercase shrink-0">
                    {(activeUser.user_name || "U")[0]}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">{activeUser.user_name || "Unknown User"}</h2>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Shield className="h-4 w-4" /> EMP: {activeUser.employee_id || "N/A"}
                      </span>
                      <span>•</span>
                      <span>Email: {activeUser.email || "N/A"}</span>
                      <span>•</span>
                      <span>Auth DB ID: {activeUser.login_id || "N/A"}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={openEditUser}
                      className="flex items-center gap-2 px-4 py-2 text-primary hover:bg-primary/10 text-sm font-medium rounded-lg transition-colors"
                    >
                      <Edit2 className="h-4 w-4" /> Edit Info
                    </button>
                    <button
                      onClick={() => setIsAddingRole(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="h-4 w-4" /> Add Role
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {isAddingRole ? (
                  <div className="bg-gray-50 rounded-xl p-5 mb-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800">Add New Role to {activeUser.user_name}</h3>
                      <button onClick={() => setIsAddingRole(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <form onSubmit={handleAddRole} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Role Title</label>
                        <select
                          required
                          value={newRole.user_role}
                          onChange={(e) => setNewRole({ ...newRole, user_role: e.target.value })}
                          className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-primary focus:border-primary"
                        >
                          <option value="">Select Role</option>
                          {availableRoles.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Branch</label>
                        <select
                          required
                          value={newRole.branch}
                          onChange={(e) => setNewRole({ ...newRole, branch: e.target.value })}
                          className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-primary focus:border-primary"
                        >
                          <option value="">Select Branch</option>
                          {branches.map((b: string) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2 flex justify-end mt-2">
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50"
                        >
                          {isLoading ? "Saving..." : "Save Role"}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : null}

                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-gray-400" />
                  Assigned Roles ({activeUser.roles.length})
                </h3>

                <div className="space-y-3">
                  {activeUser.roles.map((r: any) => {
                    const isActive = r.status?.toLowerCase() === 'active' && !r.lock_flag;
                    return (
                      <div key={r.id} className={`flex items-center justify-between p-4 rounded-xl border ${isActive ? "bg-white border-gray-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        <div className="flex items-center gap-4">
                          <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-400'}`}></div>
                          <div>
                            <div className="font-semibold text-sm">
                              {r.user_role}
                              {!isActive && <span className="ml-2 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">Inactive</span>}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Branch: {r.branch || "Any"} • ID: {r.id}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={isLoading}
                            onClick={() => handleToggleStatus(r.id, r.status, r.lock_flag)}
                            className={`p-2 rounded-md transition-colors ${isActive ? "text-amber-600 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"} disabled:opacity-50 border border-transparent hover:border-current`}
                            title={isActive ? "Deactivate Role" : "Activate Role"}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          <button
                            disabled={isLoading}
                            onClick={() => handleRemoveRole(r.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 border border-transparent hover:border-red-200"
                            title="Remove completely"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl h-full min-h-[500px] flex flex-col items-center justify-center text-gray-400">
              <UserIcon className="h-16 w-16 mb-4 text-gray-200" />
              <p>Select a user from the list to view and manage roles</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Remove Role</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Are you sure you want to completely remove this role? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  disabled={isLoading}
                  onClick={() => setDeleteModal({ isOpen: false, roleId: null })}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-200"
                >
                  Cancel
                </button>
                <button
                  disabled={isLoading}
                  onClick={confirmRemoveRole}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    "Yes, Remove Role"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Form Modal (Create or Edit) */}
      {(isCreatingUser || isEditingUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {isCreatingUser ? "Create New User" : "Edit User Info"}
              </h3>
              <button 
                onClick={() => { setIsCreatingUser(false); setIsEditingUser(false); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={isCreatingUser ? handleCreateUser : handleEditUser} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={userForm.user_name}
                    onChange={(e) => setUserForm({...userForm, user_name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={userForm.finca_email}
                    onChange={(e) => setUserForm({...userForm, finca_email: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    required
                    value={userForm.employee_id}
                    onChange={(e) => setUserForm({...userForm, employee_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="e.g. FIN-1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Login ID / User No.</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Login ID"
                      value={userForm.login_id}
                      onChange={(e) => setUserForm({...userForm, login_id: e.target.value})}
                      className="w-1/2 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                    <input
                      type="text"
                      placeholder="User No."
                      value={userForm.user_no}
                      onChange={(e) => setUserForm({...userForm, user_no: e.target.value})}
                      className="w-1/2 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                {/* Only show these if creating brand new user (first role setup) */}
                {isCreatingUser && (
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 mt-2 border-t border-gray-100 pt-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Initial Role</label>
                      <select
                        required
                        value={userForm.user_role}
                        onChange={(e) => setUserForm({ ...userForm, user_role: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="">Select Role</option>
                        {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                      <select
                        required
                        value={userForm.branch}
                        onChange={(e) => setUserForm({ ...userForm, branch: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="">Select Branch</option>
                        {branches.map((b: string) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => { setIsCreatingUser(false); setIsEditingUser(false); }}
                  className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    "Save User Info"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Error Notification Modal */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Occurred</h3>
              <p className="text-sm text-gray-500 mb-6">
                {errorModal.message}
              </p>
              <button
                onClick={() => setErrorModal({ isOpen: false, message: "" })}
                className="w-full inline-flex justify-center rounded-lg border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
