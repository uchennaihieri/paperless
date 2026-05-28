"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Search, Plus, Power, Shield, Activity, X, User as UserIcon, Edit2, ChevronDown } from "lucide-react";
import { updateUserRoleStatus, addUserRole, updateUserInformation, updateUserRowDetails, getUserFormAccess, updateUserFormAccess, getLookupValues, saveLookupValue } from "@/app/actions/team";
import { FileText, CheckCircle2, KeyRound } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";

// ── ComboSelect ──────────────────────────────────────────────────────────────
// A dropdown that lists known options AND lets the user type a custom value.
// Looks like a native <select> but allows free-text entry.
function ComboSelect({
  value, onChange, options, placeholder = "Select…", required = false, id,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const displayed = value || placeholder;

  const select = (v: string) => { onChange(v); setOpen(false); setCustom(""); };

  return (
    <div className="relative" id={id}>
      {/* Hidden native input so browser required validation still works */}
      <input type="text" required={required} value={value} onChange={() => {}} className="sr-only" tabIndex={-1} aria-hidden />

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between border rounded-lg px-4 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-primary ${
          value ? "border-gray-300 text-gray-900" : "border-gray-300 text-gray-400"
        } bg-white hover:border-gray-400 transition-colors`}
      >
        <span className="truncate">{displayed}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            <div className="max-h-48 overflow-y-auto">
              {options.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => select(opt)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-primary/5 transition-colors ${
                    value === opt ? "bg-primary/10 text-primary font-medium" : "text-gray-800"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {/* Custom value entry */}
            <div className="border-t border-gray-100 p-2">
              <div className="flex gap-1">
                <input
                  type="text"
                  value={custom}
                  onChange={e => setCustom(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && custom.trim()) { e.preventDefault(); select(custom.trim()); } }}
                  placeholder="Type custom value…"
                  className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => custom.trim() && select(custom.trim())}
                  className="px-3 py-1.5 bg-primary text-white text-xs rounded hover:bg-primary/90 shrink-0"
                >Add</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function TeamsClientPage({ users, branches, templates }: { users: any[], branches: string[], templates: any[] }) {
  const { data: session } = useSession();
  const token = (session?.user as any)?.backendToken;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isManagingForms, setIsManagingForms] = useState(false);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [assignedTemplates, setAssignedTemplates] = useState<Set<string>>(new Set());
  const [initialAssignedTemplates, setInitialAssignedTemplates] = useState<Set<string>>(new Set());
  const [applyToAll, setApplyToAll] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);

  // Lookup options loaded from DB
  const [roleOptions, setRoleOptions] = useState<string[]>(["Branch Manager", "Teller", "Operations", "Loan Officer", "Customer Service"]);
  const [branchOptions, setBranchOptions] = useState<string[]>(branches);
  const specialAccessOptions = ["Administrator", "Accountant", "Control"];

  const [userForm, setUserForm] = useState({
    user_name: "", finca_email: "", employee_id: "",
    login_id: "", user_no: "", user_role: "",
    branch: "", specialAccess: "", defaultPassword: "",
  });

  // Load dynamic lookup values on mount
  useEffect(() => {
    getLookupValues("role").then(vals => setRoleOptions(prev => Array.from(new Set([...prev, ...vals]))));
    getLookupValues("branch").then(vals => setBranchOptions(prev => Array.from(new Set([...prev, ...vals]))));
  }, []);

  // Save a custom typed value to DB and add it to local options
  const persistLookup = async (type: string, value: string, setter: (fn: (p: string[]) => string[]) => void) => {
    if (!value.trim()) return;
    setter(prev => Array.from(new Set([...prev, value.trim()])));
    await saveLookupValue(type, value.trim()).catch(() => {});
  };

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.defaultPassword || userForm.defaultPassword.length < 6) {
      showError("Please enter a default password (minimum 6 characters).");
      return;
    }
    try {
      setIsLoading(true);
      await addUserRole({ ...userForm, specialAccess: userForm.specialAccess === "None" ? undefined : userForm.specialAccess });
      // Persist custom role/branch to lookup table
      if (userForm.user_role) await persistLookup("role", userForm.user_role, setRoleOptions);
      if (userForm.branch) await persistLookup("branch", userForm.branch, setBranchOptions);
      if (token) {
        const pwRes = await fetch(`${BASE_URL}/api/v1/auth/set-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ employeeId: userForm.employee_id.trim(), password: userForm.defaultPassword }),
        });
        const pwData = await pwRes.json();
        if (!pwData.success) throw new Error(pwData.error || "Failed to set default password.");
      }
      setIsCreatingUser(false);
      setUserForm({ user_name: "", finca_email: "", employee_id: "", login_id: "", user_no: "", user_role: "", branch: "", specialAccess: "", defaultPassword: "" });
    } catch(e: any) {
      showError(e.message || "Failed to create user");
    } finally {
      setIsLoading(false);
    }
  };


  const openEditUser = () => {
    if (!activeUser) return;
    const firstRole = activeUser.roles?.[0];
    setUserForm({
      user_name: activeUser.user_name || "",
      finca_email: activeUser.email || "",
      employee_id: activeUser.employee_id || "",
      login_id: activeUser.login_id || "",
      user_no: activeUser.user_no || "",
      user_role: firstRole?.user_role || "",
      branch: firstRole?.branch || "",
      specialAccess: firstRole?.specialAccess || "",
      defaultPassword: "",
    });
    setIsEditingUser(true);
  };


  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;
    try {
      setIsLoading(true);
      const rowIds = activeUser.roles.map((r: any) => r.id);
      // Update shared identity fields across all rows
      await updateUserInformation(rowIds, {
        user_name: userForm.user_name, finca_email: userForm.finca_email,
        employee_id: userForm.employee_id, login_id: userForm.login_id, user_no: userForm.user_no,
      });
      // Update per-row fields (role, branch, specialAccess) on every row
      for (const id of rowIds) {
        await updateUserRowDetails(id, {
          user_role: userForm.user_role || undefined,
          branch: userForm.branch || undefined,
          specialAccess: userForm.specialAccess,
        });
      }
      // Persist custom values to lookup
      if (userForm.user_role) await persistLookup("role", userForm.user_role, setRoleOptions);
      if (userForm.branch) await persistLookup("branch", userForm.branch, setBranchOptions);
      if (userForm.defaultPassword.trim() && token) {
        const pwRes = await fetch(`${BASE_URL}/api/v1/auth/set-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ employeeId: userForm.employee_id.trim(), password: userForm.defaultPassword }),
        });
        const pwData = await pwRes.json();
        if (!pwData.success) throw new Error(pwData.error || "Failed to reset password.");
      }
      setIsEditingUser(false);
    } catch(e: any) {
      showError(e.message || "Failed to update user");
    } finally {
      setIsLoading(false);
    }
  };


  const handleOpenManageForms = async () => {
    if (!activeUser?.email) {
      showError("User email is missing");
      return;
    }

    // Check if this user has an Administrator role — admins bypass FormAccess and always see all forms.
    // Form access restrictions only apply to non-administrator users.
    const hasAdminRole = (activeUser.roles || []).some(
      (r: any) => r.user_role?.toLowerCase() === "administrator" || r.specialAccess?.toLowerCase().includes("administrator")
    );
    if (hasAdminRole) {
      showError(
        "This user has an Administrator role. Administrators always have access to all forms — form access restrictions do not apply to them. To restrict form access, first remove their Administrator role."
      );
      return;
    }

    setIsManagingForms(true);
    setIsLoadingForms(true);
    try {
      const res = await getUserFormAccess(activeUser.email);
      if (res.success) {
        const assignedIds = res.data.map((r: any) => r.templateId);
        setAssignedTemplates(new Set(assignedIds));
        setInitialAssignedTemplates(new Set(assignedIds));
        setApplyToAll(false);
      } else {
        showError(res.error || "Failed to load assigned forms");
      }
    } catch (e: any) {
      showError(e.message || "Failed to load assigned forms");
    } finally {
      setIsLoadingForms(false);
    }
  };

  const handleSaveForms = async () => {
    if (!activeUser?.email) return;
    try {
      setIsLoadingForms(true);

      const currentArr = Array.from(assignedTemplates);
      const initialArr = Array.from(initialAssignedTemplates);
      
      const addedIds = currentArr.filter(id => !initialAssignedTemplates.has(id));
      const removedIds = initialArr.filter(id => !assignedTemplates.has(id));

      const res = await updateUserFormAccess(
        activeUser.email, 
        currentArr,
        applyToAll,
        addedIds,
        removedIds
      );
      if (res.success) {
        setIsManagingForms(false);
      } else {
        showError(res.error || "Failed to save form access");
      }
    } catch (e: any) {
      showError(e.message || "Failed to save form access");
    } finally {
      setIsLoadingForms(false);
    }
  };

  const toggleFormAccess = (id: string) => {
    setAssignedTemplates(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroupAccess = (groupIds: string[], selectAll: boolean) => {
    setAssignedTemplates(prev => {
      const next = new Set(prev);
      if (selectAll) {
        groupIds.forEach(id => next.add(id));
      } else {
        groupIds.forEach(id => next.delete(id));
      }
      return next;
    });
  };

  const groupedTemplates = useMemo(() => {
    const groups: Record<string, any[]> = {};
    templates.forEach(tpl => {
      // Include all forms (internal and non-internal) so admins can assign them
      const owner = tpl.formOwner || "Uncategorized";
      if (!groups[owner]) groups[owner] = [];
      groups[owner].push(tpl);
    });
    return Object.keys(groups).sort().map(owner => ({
      owner,
      items: groups[owner]
    }));
  }, [templates]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Teams Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage users, their roles, and branches.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
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
            className="w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
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
                onClick={() => setSelectedUser(u)}
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
              <div className="p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex flex-col gap-5">
                  <div className="flex items-start sm:items-center gap-4 w-full">
                    <div className="h-14 w-14 sm:h-16 sm:w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold uppercase shrink-0">
                      {(activeUser.user_name || "U")[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold text-gray-900 truncate">{activeUser.user_name || "Unknown User"}</h2>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 mt-1.5 text-sm text-gray-500">
                        <span className="flex items-center gap-1 shrink-0">
                          <Shield className="h-4 w-4" /> EMP: {activeUser.employee_id || "N/A"}
                        </span>
                        <span className="hidden sm:inline text-gray-300">•</span>
                        <span className="truncate" title={activeUser.email || ""}>
                          Email: {activeUser.email || "N/A"}
                        </span>
                        <span className="hidden sm:inline text-gray-300">•</span>
                        <span className="truncate shrink-0">
                          ID: {activeUser.login_id || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full border-t border-gray-100/50 pt-2">
                    <button
                      onClick={openEditUser}
                      className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 text-primary hover:bg-primary/10 text-sm font-medium rounded-lg transition-colors border border-primary/20 hover:border-primary/40 bg-white"
                    >
                      <Edit2 className="h-4 w-4" /> Edit Info
                    </button>
                    <button
                      onClick={handleOpenManageForms}
                      className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 text-primary hover:bg-primary/10 text-sm font-medium rounded-lg transition-colors border border-primary/20 hover:border-primary/40 bg-white"
                    >
                      <FileText className="h-4 w-4" /> Manage Forms
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
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
                          <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                          <div>
                            <div className="font-semibold text-sm">
                              {r.user_role || "No Role"}
                              {!isActive && <span className="ml-2 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">Inactive</span>}
                              {r.specialAccess && <span className="ml-2 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">{r.specialAccess}</span>}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Branch: {r.branch || "Any"}
                            </div>
                          </div>
                        </div>
                        <button
                          disabled={isLoading}
                          onClick={() => handleToggleStatus(r.id, r.status, r.lock_flag)}
                          className={`p-2 rounded-md transition-colors ${isActive ? "text-amber-600 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"} disabled:opacity-50 border border-transparent hover:border-current`}
                          title={isActive ? "Deactivate" : "Activate"}
                        >
                          <Power className="h-4 w-4" />
                        </button>
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


      {/* User Form Modal (Create or Edit) */}
      {(isCreatingUser || isEditingUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
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
            
            <form onSubmit={isCreatingUser ? handleCreateUser : handleEditUser} className="flex-1 overflow-y-auto p-6 flex flex-col">
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

                {/* Role, Branch, Special Access — shown on both create and edit */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5 mt-2 border-t border-gray-100 pt-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role Title {isCreatingUser && <span className="text-red-500">*</span>}
                    </label>
                    <ComboSelect
                      required={isCreatingUser}
                      value={userForm.user_role}
                      onChange={(v) => setUserForm({ ...userForm, user_role: v })}
                      options={roleOptions}
                      placeholder="Select role…"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Branch {isCreatingUser && <span className="text-red-500">*</span>}
                    </label>
                    <ComboSelect
                      required={isCreatingUser}
                      value={userForm.branch}
                      onChange={(v) => setUserForm({ ...userForm, branch: v })}
                      options={branchOptions}
                      placeholder="Select branch…"
                    />
                  </div>
                  <div className="md:col-span-3 border-t border-gray-100 pt-4 mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Special Access</label>
                    <div className="flex flex-wrap gap-6">
                      {specialAccessOptions.map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-gray-900 transition-colors">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                            checked={userForm.specialAccess.split(",").map(s => s.trim()).includes(opt)}
                            onChange={() => {
                              const current = userForm.specialAccess.split(",").map(s => s.trim()).filter(Boolean);
                              const next = current.includes(opt) ? current.filter(s => s !== opt) : [...current, opt];
                              setUserForm({ ...userForm, specialAccess: next.join(",") });
                            }}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Default password — required on creation, optional on edit */}

                <div className="md:col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-4 mt-2">
                  <label className="block text-sm font-semibold text-amber-800 mb-1 flex items-center gap-1.5">
                    <KeyRound className="h-4 w-4 inline mr-1" />
                    {isCreatingUser ? <>Default Password <span className="text-red-500">*</span></> : "Reset Password (optional)"}
                  </label>
                  <input
                    type="text"
                    required={isCreatingUser}
                    minLength={6}
                    value={userForm.defaultPassword}
                    onChange={(e) => setUserForm({ ...userForm, defaultPassword: e.target.value })}
                    className="w-full border border-amber-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 font-mono"
                    placeholder={isCreatingUser ? "e.g. Welcome2025!" : "Leave blank to keep current password"}
                  />
                  <p className="text-xs text-amber-700 mt-1.5">
                    {isCreatingUser
                      ? "The user must change this on their first login. Share it with them securely."
                      : "If filled, the user's password will be reset and they will be required to change it on next login."}
                  </p>
                </div>

              </div>

              <div className="flex justify-end gap-3 mt-8 shrink-0">
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

      {/* Manage Forms Modal */}
      {isManagingForms && activeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> Manage Form Access
                </h3>
                <p className="text-sm text-gray-500 mt-1">Assign available forms to <span className="font-semibold text-gray-800">{activeUser.user_name}</span>.</p>
              </div>
              <button 
                onClick={() => setIsManagingForms(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
              {isLoadingForms ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <div className="h-8 w-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin mb-3"></div>
                  <p>Loading assigned forms...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
                  No forms available in the system.
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedTemplates.map(group => {
                    const togglableItems = group.items.filter((t: any) => {
                      return !activeUser?.roles?.some((r: any) => r.branch && r.branch === t.formOwner);
                    });
                    const togglableIds = togglableItems.map((t: any) => t.id);
                    
                    const allSelected = togglableIds.length > 0 && togglableIds.every((id: string) => assignedTemplates.has(id));
                    const someSelected = togglableIds.some((id: string) => assignedTemplates.has(id));
                    
                    return (
                      <div key={group.owner} className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            {group.owner}
                            <span className="text-xs font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{group.items.length}</span>
                          </h4>
                          {togglableIds.length > 0 && (
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 hover:text-gray-900 transition-colors">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                ref={el => { if (el) el.indeterminate = !allSelected && someSelected; }}
                                onChange={(e) => toggleGroupAccess(togglableIds, e.target.checked)}
                                className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                              />
                              Select All
                            </label>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {group.items.map((tpl: any) => {
                            const isAutoAssigned = activeUser?.roles?.some((r: any) => r.branch && r.branch === tpl.formOwner);
                            const isSelected = isAutoAssigned || assignedTemplates.has(tpl.id);
                            
                            return (
                              <div
                                key={tpl.id}
                                onClick={() => { if (!isAutoAssigned) toggleFormAccess(tpl.id); }}
                                className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                                  isAutoAssigned
                                    ? "bg-gray-50 border-gray-200 cursor-not-allowed opacity-80"
                                    : isSelected 
                                      ? "bg-white border-primary/40 shadow-sm ring-1 ring-primary/10 cursor-pointer" 
                                      : "bg-white border-gray-200 hover:border-gray-300 cursor-pointer"
                                }`}
                              >
                                <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
                                  isSelected 
                                    ? isAutoAssigned ? "bg-gray-400 border-gray-400 text-white" : "bg-primary border-primary text-white" 
                                    : "bg-white border-gray-300 text-transparent"
                                }`}>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <h4 className={`text-sm font-semibold ${isSelected && !isAutoAssigned ? "text-gray-900" : "text-gray-700"}`}>
                                      {tpl.name}
                                    </h4>
                                    {tpl.isInternal && (
                                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
                                        Internal
                                      </span>
                                    )}
                                    {isAutoAssigned && (
                                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 border border-gray-300 shrink-0" title="User is automatically assigned this form because their branch matches the form owner.">
                                        Auto-Assigned
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                    {tpl.description || "No description"}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t border-gray-100 bg-white shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1 text-center sm:text-left">
                <span className="text-sm text-gray-500 font-medium">
                  {assignedTemplates.size} form{assignedTemplates.size === 1 ? "" : "s"} selected
                </span>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-700 font-medium justify-center sm:justify-start hover:text-amber-900">
                  <input
                    type="checkbox"
                    checked={applyToAll}
                    onChange={(e) => setApplyToAll(e.target.checked)}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  Apply added/removed forms to ALL users
                </label>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setIsManagingForms(false)}
                  disabled={isLoadingForms}
                  className="flex-1 sm:flex-none justify-center px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveForms}
                  disabled={isLoadingForms}
                  className="flex-1 sm:flex-none justify-center px-5 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 flex items-center gap-2"
                >
                  {isLoadingForms ? "Saving..." : "Save Access"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
