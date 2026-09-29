"use client";

import React, { useState, useMemo } from "react";
import { useFleet } from "@/context/FleetContext";
import { useAuth } from "@/context/AuthContext";
import {
  AppUser,
  UserRole,
  UserStatus,
  AppModule,
  ModulePermissions,
  MODULE_NAMES,
  ROLE_DEFAULT_PERMISSIONS,
} from "@/types/fleet";
import {
  ShieldCheck,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Building,
  Edit2,
  Trash2,
  X,
  UserCheck,
  RotateCcw,
  Sparkles,
  Info,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldAlert,
} from "lucide-react";

const ROLE_COLORS: Record<UserRole, { badge: string; text: string; bg: string }> = {
  "Super Admin": {
    badge: "bg-purple-100 text-purple-800 border-purple-200",
    text: "text-purple-700",
    bg: "bg-purple-50",
  },
  "Safety Manager": {
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
  },
  Dispatcher: {
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    text: "text-blue-700",
    bg: "bg-blue-50",
  },
  "Maintenance Tech": {
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    text: "text-amber-700",
    bg: "bg-amber-50",
  },
  Auditor: {
    badge: "bg-slate-100 text-slate-800 border-slate-200",
    text: "text-slate-700",
    bg: "bg-slate-50",
  },
  Custom: {
    badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
    text: "text-indigo-700",
    bg: "bg-indigo-50",
  },
};

const ALL_MODULES: AppModule[] = [
  "trucks",
  "trailers",
  "drivers",
  "maintenance",
  "shops",
  "documents",
  "users",
  "settings",
];

const ALL_ROLES: UserRole[] = [
  "Super Admin",
  "Safety Manager",
  "Dispatcher",
  "Maintenance Tech",
  "Auditor",
  "Custom",
];

export default function UsersAndPermissionsPage() {
  const { users, addUser, updateUser, deleteUser, resetUsers } =
    useFleet();
  const { currentUser, updateCurrentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "Super Admin";

  const [activeTab, setActiveTab] = useState<"directory" | "matrix">("directory");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [showFormPassword, setShowFormPassword] = useState(false);

  // Dedicated Reset Password Modal State (Super Admin)
  const [resetTargetUser, setResetTargetUser] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<{
    userName: string;
    email: string;
    password?: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Helper: Generate Random Memorable Secure Password
  const generateRandomPassword = () => {
    const prefixes = ["Zdunje", "Fleet", "Truck", "Secure", "Haul", "Turbo", "Vanguard"];
    const specials = ["!", "@", "#", "$", "%", "*"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const special = specials[Math.floor(Math.random() * specials.length)];
    return `${prefix}${num}${special}`;
  };

  // Helper: Copy Credentials to Clipboard
  const handleCopyCredentials = (email: string, pass: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const text = `Zdunje Trucking Portal Credentials\nEmail: ${email}\nPassword: ${pass}\nLogin URL: ${origin}/login`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  // Dedicated Reset Password Flow
  const openResetPasswordModal = (user: AppUser) => {
    setResetTargetUser(user);
    const generated = generateRandomPassword();
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowResetPassword(true);
    setResetError(null);
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    if (!newPassword || newPassword.length < 6) {
      setResetError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    // Update in FleetContext
    updateUser(resetTargetUser.id, { password: newPassword });

    // If resetting for current active user, sync auth context
    if (currentUser && currentUser.id === resetTargetUser.id) {
      updateCurrentUser({ ...currentUser, password: newPassword });
    }

    setSuccessBanner({
      userName: resetTargetUser.name,
      email: resetTargetUser.email,
      password: newPassword,
    });
    setResetTargetUser(null);
    setResetError(null);
  };

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    department: string;
    role: UserRole;
    status: UserStatus;
    notes: string;
    permissions: ModulePermissions;
    password?: string;
  }>({
    name: "",
    email: "",
    phone: "",
    department: "Operations & Dispatch",
    role: "Dispatcher",
    status: "Active",
    notes: "",
    permissions: JSON.parse(JSON.stringify(ROLE_DEFAULT_PERMISSIONS["Dispatcher"])),
    password: "",
  });

  const openAddModal = () => {
    setEditingUser(null);
    setShowFormPassword(false);
    setFormData({
      name: "",
      email: "",
      phone: "",
      department: "Operations & Dispatch",
      role: "Dispatcher",
      status: "Active",
      notes: "",
      permissions: JSON.parse(JSON.stringify(ROLE_DEFAULT_PERMISSIONS["Dispatcher"])),
      password: isSuperAdmin ? generateRandomPassword() : "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: AppUser) => {
    setEditingUser(user);
    setShowFormPassword(false);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      department: user.department,
      role: user.role,
      status: user.status,
      notes: user.notes || "",
      permissions: JSON.parse(JSON.stringify(user.permissions)),
      password: "",
    });
    setIsModalOpen(true);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setFormData((prev) => ({
      ...prev,
      role: newRole,
      permissions:
        newRole === "Custom"
          ? prev.permissions
          : JSON.parse(JSON.stringify(ROLE_DEFAULT_PERMISSIONS[newRole])),
    }));
  };

  const handlePermissionToggle = (
    module: AppModule,
    action: "view" | "create" | "edit" | "delete"
  ) => {
    setFormData((prev) => {
      const updated = {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module],
          [action]: !prev.permissions[module][action],
        },
      };

      // If disabling view, also disable create/edit/delete
      if (action === "view" && prev.permissions[module].view) {
        updated[module] = {
          view: false,
          create: false,
          edit: false,
          delete: false,
        };
      }
      // If enabling create/edit/delete, also enable view
      if (action !== "view" && !prev.permissions[module].view) {
        updated[module].view = true;
      }

      return {
        ...prev,
        role: "Custom",
        permissions: updated,
      };
    });
  };

  const grantAllPermissions = () => {
    const allGranted: ModulePermissions = {} as ModulePermissions;
    ALL_MODULES.forEach((m) => {
      allGranted[m] = { view: true, create: true, edit: true, delete: true };
    });
    setFormData((prev) => ({
      ...prev,
      role: "Custom",
      permissions: allGranted,
    }));
  };

  const grantReadOnlyPermissions = () => {
    const readOnly: ModulePermissions = {} as ModulePermissions;
    ALL_MODULES.forEach((m) => {
      readOnly[m] = { view: true, create: false, edit: false, delete: false };
    });
    setFormData((prev) => ({
      ...prev,
      role: "Auditor",
      permissions: readOnly,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    if (editingUser) {
      const updatePayload: Partial<AppUser> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        role: formData.role,
        status: formData.status,
        notes: formData.notes,
        permissions: formData.permissions,
      };

      if (formData.password && formData.password.trim().length > 0) {
        updatePayload.password = formData.password.trim();
      }

      updateUser(editingUser.id, updatePayload);

      if (currentUser && currentUser.id === editingUser.id) {
        updateCurrentUser({ ...currentUser, ...updatePayload });
      }

      if (updatePayload.password) {
        setSuccessBanner({
          userName: formData.name,
          email: formData.email,
          password: updatePayload.password,
        });
      }
    } else {
      const newUserPayload = {
        ...formData,
        password: formData.password?.trim() || undefined,
      };
      addUser(newUserPayload);

      if (newUserPayload.password) {
        setSuccessBanner({
          userName: formData.name,
          email: formData.email,
          password: newUserPayload.password,
        });
      }
    }
    setIsModalOpen(false);
  };

  const handleDeleteUser = (user: AppUser) => {
    if (
      window.confirm(
        `Are you sure you want to remove ${user.name} (${user.email})? They will lose access to Zdunje Trucking LLC platform.`
      )
    ) {
      deleteUser(user.id);
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchSearch =
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        u.department.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q);

      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus = statusFilter === "all" || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // Statistics
  const activeCount = users.filter((u) => u.status === "Active").length;
  const invitedCount = users.filter((u) => u.status === "Invited").length;
  const suspendedCount = users.filter((u) => u.status === "Suspended").length;
  const adminCount = users.filter((u) => u.role === "Super Admin").length;

  return (
    <div className="space-y-6">
      {/* Top Banner Alert for Credential Management / Password Updates */}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200 shadow-xs">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-950">
                Credentials successfully configured for {successBanner.userName}!
              </p>
              <div className="text-xs text-emerald-800 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                <span>
                  Email: <span className="font-mono font-bold">{successBanner.email}</span>
                </span>
                {successBanner.password && (
                  <span>
                    Password:{" "}
                    <span className="font-mono font-bold bg-white/70 px-1.5 py-0.5 rounded border border-emerald-200">
                      {successBanner.password}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
            {successBanner.password && (
              <button
                type="button"
                onClick={() => handleCopyCredentials(successBanner.email, successBanner.password!)}
                className="h-8 px-3 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center space-x-1.5 shadow-2xs"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Copy Login Info</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSuccessBanner(null)}
              className="p-1.5 text-emerald-600 hover:text-emerald-800 rounded-lg hover:bg-emerald-100/60 transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Users & Roles Permissions
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
              {users.length} Team Members
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage organizational team access, assign predefined roles, and configure granular permissions across all modules.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Reset users list back to the default Zdunje Trucking leadership and dispatch team?"
                )
              ) {
                resetUsers();
              }
            }}
            className="h-10 px-3 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5"
            title="Reset to default seed team"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Team</span>
          </button>

          <button
            onClick={openAddModal}
            className="h-10 px-4 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add / Invite User</span>
          </button>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Team Members
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {users.length}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Zdunje Trucking LLC Staff
            </p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Access
            </p>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {activeCount}
            </p>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              Authorized & Enabled
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Invites
            </p>
            <p className="text-2xl font-black text-amber-600 mt-1">
              {invitedCount}
            </p>
            <p className="text-[11px] text-amber-700 font-medium mt-0.5">
              Awaiting Email Confirmation
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Super Admins
            </p>
            <p className="text-2xl font-black text-purple-600 mt-1">
              {adminCount}
            </p>
            <p className="text-[11px] text-purple-700 font-medium mt-0.5">
              Full Unrestricted Privileges
            </p>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Tabs (Directory vs Matrix) */}
      <div className="border-b border-slate-200">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab("directory")}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              activeTab === "directory"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Team Directory ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              activeTab === "matrix"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Roles & Permissions Matrix
          </button>
        </div>
      </div>

      {/* TAB 1: TEAM DIRECTORY */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          {/* Controls: Search, Role Filter, Status Filter */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff by name, email, department, or phone..."
                className="w-full h-10 pl-9 pr-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Roles ({users.length})</option>
                  {ALL_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 h-8 rounded-md font-medium transition-colors ${
                    statusFilter === "all"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({users.length})
                </button>
                <button
                  onClick={() => setStatusFilter("Active")}
                  className={`px-3 h-8 rounded-md font-medium transition-colors ${
                    statusFilter === "Active"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  onClick={() => setStatusFilter("Invited")}
                  className={`px-3 h-8 rounded-md font-medium transition-colors ${
                    statusFilter === "Invited"
                      ? "bg-amber-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Invited ({invitedCount})
                </button>
                <button
                  onClick={() => setStatusFilter("Suspended")}
                  className={`px-3 h-8 rounded-md font-medium transition-colors ${
                    statusFilter === "Suspended"
                      ? "bg-slate-700 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Suspended ({suspendedCount})
                </button>
              </div>
            </div>
          </div>

          {/* User Directory List */}
          {filteredUsers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-base font-semibold text-slate-700">
                No Users Found
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No team members match your filter criteria. Try adjusting your search term or invite a new staff member.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredUsers.map((user) => {
                const roleMeta = ROLE_COLORS[user.role] || ROLE_COLORS.Custom;

                return (
                  <div
                    key={user.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    {/* User Profile Info */}
                    <div className="flex items-start space-x-3.5">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-slate-900 text-base">
                            {user.name}
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${roleMeta.badge}`}
                          >
                            {user.role}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              user.status === "Active"
                                ? "bg-emerald-100 text-emerald-800"
                                : user.status === "Invited"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {user.status}
                          </span>
                          {isSuperAdmin && user.password && (
                            <span
                              title="Password has been assigned by administration"
                              className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center space-x-1"
                            >
                              <Key className="w-2.5 h-2.5" />
                              <span>Password Set</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center space-x-1">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <a
                              href={`mailto:${user.email}`}
                              className="hover:text-blue-600 underline-offset-2 hover:underline"
                            >
                              {user.email}
                            </a>
                          </span>

                          {user.phone && (
                            <span className="flex items-center space-x-1 font-mono">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{user.phone}</span>
                            </span>
                          )}

                          <span className="flex items-center space-x-1">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            <span>{user.department}</span>
                          </span>
                        </div>

                        {user.notes && (
                          <p className="text-xs text-slate-500 italic mt-1 line-clamp-1">
                            &quot;{user.notes}&quot;
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-2 shrink-0">
                      {/* Edit Button */}
                      <button
                        onClick={() => openEditModal(user)}
                        className="h-9 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center space-x-1.5 shadow-2xs"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ROLES & PERMISSIONS MATRIX */}
      {activeTab === "matrix" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-lg flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <span>Organizational Role Permissions Matrix</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of default permissions granted to staff members based on their assigned role in Zdunje Trucking LLC.
              </p>
            </div>

            <button
              onClick={openAddModal}
              className="h-10 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center space-x-2 shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite With Role</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-3.5 px-6">System Module</th>
                  <th className="py-3.5 px-4 text-purple-700">Super Admin</th>
                  <th className="py-3.5 px-4 text-emerald-700">Safety Manager</th>
                  <th className="py-3.5 px-4 text-blue-700">Dispatcher</th>
                  <th className="py-3.5 px-4 text-amber-700">Maintenance Tech</th>
                  <th className="py-3.5 px-4 text-slate-700">Auditor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {ALL_MODULES.map((module) => {
                  const info = MODULE_NAMES[module];

                  return (
                    <tr key={module} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 text-sm">
                          {info.label}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {info.description}
                        </div>
                      </td>

                      {/* Super Admin */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">
                          Full Control
                        </span>
                      </td>

                      {/* Safety Manager */}
                      <td className="py-4 px-4">
                        {module === "drivers" || module === "documents" ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                            Full Control
                          </span>
                        ) : module === "trucks" || module === "trailers" || module === "users" ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                            View Only
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">— No Access —</span>
                        )}
                      </td>

                      {/* Dispatcher */}
                      <td className="py-4 px-4">
                        {module === "trucks" || module === "trailers" ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                            Create & Edit
                          </span>
                        ) : module === "shops" || module === "documents" ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 font-medium border border-blue-100">
                            Upload / Edit
                          </span>
                        ) : module === "drivers" || module === "maintenance" ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                            View Only
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">— No Access —</span>
                        )}
                      </td>

                      {/* Maintenance Tech */}
                      <td className="py-4 px-4">
                        {module === "maintenance" || module === "shops" ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                            Full Control
                          </span>
                        ) : module === "trucks" || module === "trailers" || module === "documents" ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                            View & Logs
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">— No Access —</span>
                        )}
                      </td>

                      {/* Auditor */}
                      <td className="py-4 px-4">
                        {module !== "users" && module !== "settings" ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                            View Only
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">— No Access —</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD / EDIT USER MODAL (max-w-5xl, non-clipping, h-10 inputs) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col my-auto overflow-hidden">
            {/* Modal Header */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <span>
                    {editingUser
                      ? `Edit Team Member: ${editingUser.name}`
                      : "Add / Invite New Team Member"}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Configure role assignment, organizational department, and module-specific permissions.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* Personal Information */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    1. Account & Contact Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="e.g. Adnan Hadzic"
                        className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                        Work Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="e.g. adnan@zdunjetrucking.com"
                        className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        placeholder="(312) 555-0199"
                        className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                        Department
                      </label>
                      <select
                        value={formData.department}
                        onChange={(e) =>
                          setFormData({ ...formData, department: e.target.value })
                        }
                        className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="Executive & Ownership">Executive & Ownership</option>
                        <option value="Operations & Dispatch">Operations & Dispatch</option>
                        <option value="Safety & Compliance">Safety & Compliance</option>
                        <option value="Fleet Maintenance & Repair">Fleet Maintenance & Repair</option>
                        <option value="Accounting & Settlement">Accounting & Settlement</option>
                        <option value="DOT Safety Audit">DOT Safety Audit</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Role & Status */}
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>2. Role Assignment & Access Level</span>
                    <span className="text-[11px] font-normal text-slate-500 lowercase">
                      selecting a role pre-fills default permissions below
                    </span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                        Assigned Role
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) =>
                          handleRoleChange(e.target.value as UserRole)
                        }
                        className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-800"
                      >
                        <option value="Super Admin">👑 Super Admin (Full Control Everything)</option>
                        <option value="Safety Manager">🛡️ Safety Manager (Drivers & Documents Vault)</option>
                        <option value="Dispatcher">🚚 Dispatcher (Trucks, Trailers, Driver Assign)</option>
                        <option value="Maintenance Tech">🔧 Maintenance Tech (Work Orders & Shops)</option>
                        <option value="Auditor">📋 Auditor / Viewer (Read-Only Access)</option>
                        <option value="Custom">⚙️ Custom (Tailored Module Overrides)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                        Account Access Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value as UserStatus,
                          })
                        }
                        className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="Active">Active (Immediate Login Access)</option>
                        <option value="Invited">Invited (Send Email Invitation Link)</option>
                        <option value="Suspended">Suspended (Temporarily Disabled)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Credentials & Password Setup (Super Admin) */}
                {isSuperAdmin && (
                  <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200/80 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                          <Key className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                            {editingUser ? "Account Password & Credentials" : "Login Password (Super Admin Only)"}
                          </h4>
                          <p className="text-[11px] text-purple-700">
                            {editingUser
                              ? "Leave blank to keep existing password, or enter a new one to reset credentials."
                              : "Set initial password so this staff member can log in to the portal."}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const gen = generateRandomPassword();
                          setFormData((prev) => ({ ...prev, password: gen }));
                          setShowFormPassword(true);
                        }}
                        className="h-7 px-2.5 text-[11px] font-semibold text-purple-700 bg-white hover:bg-purple-100 border border-purple-200 rounded-md transition-colors flex items-center space-x-1.5 shadow-2xs self-start sm:self-auto"
                      >
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        <span>Generate Password</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-purple-900 uppercase mb-1">
                          {editingUser ? "New Password (optional)" : "Account Password"}
                        </label>
                        <div className="relative">
                          <input
                            type={showFormPassword ? "text" : "password"}
                            value={formData.password || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, password: e.target.value })
                            }
                            placeholder={editingUser ? "•••••••• (leave blank to keep unchanged)" : "e.g. Zdunje2026!"}
                            className="w-full h-10 pl-3 pr-10 text-sm font-mono border border-purple-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowFormPassword(!showFormPassword)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2"
                          >
                            {showFormPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col justify-end">
                        <div className="p-2.5 bg-white/90 rounded-lg border border-purple-100 text-[11px] text-purple-800 space-y-0.5">
                          <p className="font-semibold flex items-center space-x-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-600 inline" />
                            <span>Super Admin Credential Control</span>
                          </p>
                          <p className="text-slate-500 text-[10px]">
                            {formData.password
                              ? `Assigned password: "${formData.password}"`
                              : editingUser
                              ? "Existing password will be preserved untouched."
                              : "If left blank, user can be assigned a password later."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Granular Module Permissions Matrix */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {isSuperAdmin ? "4. Granular Module Permissions" : "3. Granular Module Permissions"}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Check or uncheck individual privileges to customize access for this member.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={grantAllPermissions}
                        className="h-8 px-2.5 text-xs font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                      >
                        Grant All
                      </button>
                      <button
                        type="button"
                        onClick={grantReadOnlyPermissions}
                        className="h-8 px-2.5 text-xs font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                      >
                        Read Only
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleRoleChange(
                            formData.role === "Custom"
                              ? "Dispatcher"
                              : formData.role
                          )
                        }
                        className="h-8 px-2.5 text-xs font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                      >
                        Reset Role Defaults
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 uppercase font-bold">
                          <th className="py-2.5 px-4">Module Name</th>
                          <th className="py-2.5 px-3 text-center">View</th>
                          <th className="py-2.5 px-3 text-center">Create</th>
                          <th className="py-2.5 px-3 text-center">Edit</th>
                          <th className="py-2.5 px-3 text-center">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ALL_MODULES.map((module) => {
                          const perm = formData.permissions[module] || {
                            view: false,
                            create: false,
                            edit: false,
                            delete: false,
                          };
                          const meta = MODULE_NAMES[module];

                          return (
                            <tr
                              key={module}
                              className="hover:bg-slate-50/50 transition-colors"
                            >
                              <td className="py-2.5 px-4 font-semibold text-slate-800">
                                <div>{meta.label}</div>
                                <div className="text-[10px] text-slate-400 font-normal">
                                  {meta.description}
                                </div>
                              </td>

                              {/* View */}
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.view}
                                  onChange={() =>
                                    handlePermissionToggle(module, "view")
                                  }
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </td>

                              {/* Create */}
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.create}
                                  onChange={() =>
                                    handlePermissionToggle(module, "create")
                                  }
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </td>

                              {/* Edit */}
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.edit}
                                  onChange={() =>
                                    handlePermissionToggle(module, "edit")
                                  }
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </td>

                              {/* Delete */}
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.delete}
                                  onChange={() =>
                                    handlePermissionToggle(module, "delete")
                                  }
                                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                    Internal Notes / Emergency Contact
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Staff title, terminal desk location, emergency contact phone, supervisor notes..."
                    className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl">
                <div className="text-xs text-slate-500 flex items-center space-x-1.5">
                  <Info className="w-4 h-4 text-slate-400" />
                  <span>
                    Permissions apply immediately upon saving.
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  {editingUser && isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = editingUser;
                        setIsModalOpen(false);
                        openResetPasswordModal(target);
                      }}
                      className="h-10 px-3.5 text-xs font-bold text-amber-700 hover:bg-amber-100 bg-amber-50 border border-amber-200 rounded-lg transition-colors flex items-center space-x-1.5"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-600" />
                      <span>Reset Password</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="h-10 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-10 px-5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingUser ? "Update User" : "Save Team Member"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL (Super Admin) */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-purple-100 bg-purple-50/80">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Reset User Password
                  </h3>
                  <p className="text-xs text-purple-700">
                    Super Admin Credential Control
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResetTargetUser(null);
                  setResetError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target User Info Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                  {resetTargetUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                    <span>{resetTargetUser.name}</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-800">
                      {resetTargetUser.role}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    {resetTargetUser.email}
                  </div>
                </div>
              </div>

              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  resetTargetUser.status === "Active"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {resetTargetUser.status}
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              {resetError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const gen = generateRandomPassword();
                      setNewPassword(gen);
                      setConfirmPassword(gen);
                    }}
                    className="text-[11px] font-semibold text-purple-700 hover:text-purple-800 flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full h-10 pl-3 pr-10 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2"
                  >
                    {showResetPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type={showResetPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type password"
                  className={`w-full h-10 px-3 text-sm font-mono border rounded-lg focus:outline-none focus:ring-2 ${
                    confirmPassword && newPassword !== confirmPassword
                      ? "border-red-300 focus:ring-red-500 bg-red-50/20"
                      : "border-slate-300 focus:ring-purple-500"
                  }`}
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[11px] text-red-600 mt-1">Passwords do not match.</p>
                )}
              </div>

              {/* Quick Credentials Copy Preview */}
              {newPassword && (
                <div className="p-3 bg-purple-50/50 border border-purple-200/70 rounded-xl flex items-center justify-between text-xs">
                  <div className="font-mono text-purple-900 truncate mr-2">
                    <span className="text-purple-600 font-semibold">Ready:</span> {newPassword}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCredentials(resetTargetUser.email, newPassword)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-purple-800 bg-white hover:bg-purple-100 border border-purple-200 rounded-md transition-colors flex items-center space-x-1 shrink-0 shadow-2xs"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-purple-600" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setResetTargetUser(null);
                    setResetError(null);
                  }}
                  className="h-10 px-4 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPassword || newPassword !== confirmPassword || newPassword.length < 6}
                  className="h-10 px-5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
