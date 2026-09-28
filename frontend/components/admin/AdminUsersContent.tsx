"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Search,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Mail,
  Building2,
  Lock,
  Trash2,
  Pencil,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

/* =====================================================
   TYPES
===================================================== */

interface User {
  _id: string;
  name: string;
  email: string;
  department?: string;
  role: "ADMIN" | "EMPLOYEE";
  createdAt: string;
}

interface UsersResponse {
  success: boolean;
  users: User[];
  message?: string;
}

interface RoleUpdateResponse {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    department?: string;
    role: "ADMIN" | "EMPLOYEE";
  };
}

interface DeleteUserResponse {
  success: boolean;
  message?: string;
}

interface EmailUpdateResponse {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    department?: string;
    role: "ADMIN" | "EMPLOYEE";
  };
}

/* =====================================================
   COMPONENT
===================================================== */

export default function AdminUsersContent() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] =
    useState<User[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [roleFilter, setRoleFilter] =
    useState<
      "ALL" | "ADMIN" | "EMPLOYEE"
    >("ALL");

  const [updatingUserId, setUpdatingUserId] =
    useState<string | null>(null);

  /* =====================================================
     DELETE USER STATE
  ===================================================== */

  const [deleteUser, setDeleteUser] =
    useState<User | null>(null);

  const [deletingUserId, setDeletingUserId] =
    useState<string | null>(null);

  /* =====================================================
     EDIT EMAIL STATE
  ===================================================== */

  const [editingEmailUserId, setEditingEmailUserId] =
    useState<string | null>(null);

  const [editingEmail, setEditingEmail] =
    useState("");

  const [emailConfirmationUser, setEmailConfirmationUser] =
    useState<User | null>(null);

  const [emailConfirmationNewEmail, setEmailConfirmationNewEmail] =
    useState("");

  const [savingEmailUserId, setSavingEmailUserId] =
    useState<string | null>(null);

  /* =====================================================
     FETCH USERS
  ===================================================== */

  async function fetchUsers(
    showRefresh = false
  ) {
    try {
      setError("");
      setSuccessMessage("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(
        `${API_URL}/api/users`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const result: UsersResponse =
        await response.json();

      if (!response.ok) {
        setError(
          result.message ||
            "Failed to load users"
        );

        return;
      }

      setUsers(result.users || []);
    } catch (error) {
      console.error(
        "Fetch users request failed:",
        error
      );

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    fetchUsers();
  }, []);

  /* =====================================================
     CHANGE USER ROLE
  ===================================================== */

  async function changeRole(
    userId: string,
    role: "ADMIN" | "EMPLOYEE"
  ) {
    if (
      currentUser?.id &&
      currentUser.id === userId
    ) {
      setError(
        "You cannot change your own admin access."
      );

      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to change this user's role to ${role}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingUserId(userId);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `${API_URL}/api/users/${userId}/role`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            role,
          }),
        }
      );

      const result: RoleUpdateResponse =
        await response.json();

      if (!response.ok) {
        setError(
          result.message ||
            "Failed to update user role"
        );

        return;
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user._id === userId
            ? {
                ...user,
                role,
              }
            : user
        )
      );

      setSuccessMessage(
        result.message ||
          "User role updated successfully."
      );
    } catch (error) {
      console.error(
        "Role update request failed:",
        error
      );

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setUpdatingUserId(null);
    }
  }

  /* =====================================================
     EDIT EMAIL
  ===================================================== */

  function startEmailEdit(user: User) {
    setError("");
    setSuccessMessage("");

    setEditingEmailUserId(
      user._id
    );

    setEditingEmail(user.email);
  }

  function cancelEmailEdit() {
    if (savingEmailUserId) {
      return;
    }

    setEditingEmailUserId(null);
    setEditingEmail("");
  }

  /* =====================================================
     OPEN EMAIL CONFIRMATION
  ===================================================== */

  function openEmailConfirmation(
    user: User
  ) {
    const newEmail =
      editingEmail
        .trim()
        .toLowerCase();

    if (!newEmail) {
      setError(
        "Email address is required."
      );

      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        newEmail
      )
    ) {
      setError(
        "Please enter a valid email address."
      );

      return;
    }

    if (
      !newEmail.endsWith(
        "@dangote.com"
      )
    ) {
      setError(
        "Only @dangote.com email addresses are allowed."
      );

      return;
    }

    if (
      newEmail ===
      user.email.toLowerCase()
    ) {
      setError(
        "The new email is the same as the current email."
      );

      return;
    }

    setError("");
    setSuccessMessage("");

    setEmailConfirmationUser(
      user
    );

    setEmailConfirmationNewEmail(
      newEmail
    );
  }

  /* =====================================================
     CLOSE EMAIL CONFIRMATION
  ===================================================== */

  function closeEmailConfirmation() {
    if (savingEmailUserId) {
      return;
    }

    setEmailConfirmationUser(
      null
    );

    setEmailConfirmationNewEmail(
      ""
    );
  }

  /* =====================================================
     UPDATE EMAIL
  ===================================================== */

  async function handleEmailUpdate() {
    if (!emailConfirmationUser) {
      return;
    }

    const user =
      emailConfirmationUser;

    const newEmail =
      emailConfirmationNewEmail;

    try {
      setSavingEmailUserId(
        user._id
      );

      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `${API_URL}/api/users/${user._id}/email`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email: newEmail,
          }),
        }
      );

      const result: EmailUpdateResponse =
        await response.json();

      if (!response.ok) {
        setError(
          result.message ||
            "Failed to update user email."
        );

        return;
      }

      setUsers((currentUsers) =>
        currentUsers.map(
          (currentUser) =>
            currentUser._id ===
            user._id
              ? {
                  ...currentUser,
                  email:
                    result.user?.email ||
                    newEmail,
                }
              : currentUser
        )
      );

      setSuccessMessage(
        result.message ||
          "User email updated successfully."
      );

      setEditingEmailUserId(
        null
      );

      setEditingEmail("");

      setEmailConfirmationUser(
        null
      );

      setEmailConfirmationNewEmail(
        ""
      );
    } catch (error) {
      console.error(
        "Email update request failed:",
        error
      );

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setSavingEmailUserId(
        null
      );
    }
  }

  /* =====================================================
     OPEN DELETE CONFIRMATION
  ===================================================== */

  function openDeleteConfirmation(
    user: User
  ) {
    const isCurrentUser =
      currentUser?.id === user._id;

    if (isCurrentUser) {
      setError(
        "You cannot delete your own account."
      );

      return;
    }

    setError("");
    setSuccessMessage("");

    setDeleteUser(user);
  }

  /* =====================================================
     CLOSE DELETE CONFIRMATION
  ===================================================== */

  function closeDeleteConfirmation() {
    if (deletingUserId) {
      return;
    }

    setDeleteUser(null);
  }

  /* =====================================================
     DELETE USER
  ===================================================== */

  async function handleDeleteUser() {
    if (!deleteUser) {
      return;
    }

    if (
      currentUser?.id &&
      currentUser.id ===
        deleteUser._id
    ) {
      setError(
        "You cannot delete your own account."
      );

      setDeleteUser(null);

      return;
    }

    try {
      setDeletingUserId(
        deleteUser._id
      );

      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `${API_URL}/api/users/${deleteUser._id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const result: DeleteUserResponse =
        await response.json();

      if (!response.ok) {
        setError(
          result.message ||
            "Failed to delete user."
        );

        return;
      }

      setUsers((currentUsers) =>
        currentUsers.filter(
          (user) =>
            user._id !==
            deleteUser._id
        )
      );

      setSuccessMessage(
        result.message ||
          `${deleteUser.name} was deleted successfully.`
      );

      setDeleteUser(null);
    } catch (error) {
      console.error(
        "Delete user request failed:",
        error
      );

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setDeletingUserId(null);
    }
  }

  /* =====================================================
     FILTER USERS
  ===================================================== */

  const filteredUsers =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      return users.filter(
        (user) => {
          const matchesSearch =
            !searchValue ||
            user.name
              .toLowerCase()
              .includes(
                searchValue
              ) ||
            user.email
              .toLowerCase()
              .includes(
                searchValue
              ) ||
            user.department
              ?.toLowerCase()
              .includes(
                searchValue
              );

          const matchesRole =
            roleFilter === "ALL" ||
            user.role ===
              roleFilter;

          return (
            matchesSearch &&
            matchesRole
          );
        }
      );
    }, [
      users,
      search,
      roleFilter,
    ]);

  /* =====================================================
     STATISTICS
  ===================================================== */

  const totalAdmins =
    users.filter(
      (user) =>
        user.role === "ADMIN"
    ).length;

  const totalEmployees =
    users.filter(
      (user) =>
        user.role === "EMPLOYEE"
    ).length;

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#EEF4FF] p-5 md:p-8 lg:p-10">

        <div className="mb-8">

          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#E83B32]">
            Administration
          </p>

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#102D72] text-white">
              <Users size={22} />
            </div>

            <h1 className="text-3xl font-bold text-[#10275F] md:text-4xl">
              Users
            </h1>

          </div>

          <p className="mt-2 text-sm text-[#64748B]">
            Manage employees and administrator roles.
          </p>

        </div>

        <div className="flex min-h-[55vh] items-center justify-center rounded-2xl border border-[#D5E2F7] bg-white shadow-sm">

          <div className="text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF4FF]">

              <RefreshCw
                size={27}
                className="animate-spin text-[#1D55B8]"
              />

            </div>

            <p className="mt-4 text-sm font-semibold text-[#64748B]">
              Loading users...
            </p>

          </div>

        </div>

      </main>
    );
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <>
      <main className="min-h-screen bg-[#EEF4FF] p-5 md:p-8 lg:p-10">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#E83B32]">
              Administration
            </p>

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#102D72] text-white">
                <Users size={22} />
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-[#10275F] md:text-4xl">
                Users
              </h1>

            </div>

            <p className="mt-2 text-sm text-[#64748B]">
              Manage employees and administrator roles.
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              fetchUsers(true)
            }
            disabled={refreshing}
            className="
              inline-flex
              h-11
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-[#D5E2F7]
              bg-white
              px-5
              text-sm
              font-bold
              text-[#10275F]
              shadow-sm
              transition
              hover:border-[#B8CCEC]
              hover:bg-[#F6F9FF]
              hover:text-[#1D55B8]
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >

            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}

          </button>

        </div>

        {/* =================================================
            STATISTICS
        ================================================= */}

        <div className="mb-6 grid gap-5 sm:grid-cols-3">

          {/* TOTAL USERS */}

          <StatCard
            title="Total Users"
            value={users.length}
            icon={
              <Users size={21} />
            }
          />

          {/* ADMINISTRATORS */}

          <StatCard
            title="Administrators"
            value={totalAdmins}
            icon={
              <ShieldCheck
                size={21}
              />
            }
          />

          {/* EMPLOYEES */}

          <StatCard
            title="Employees"
            value={totalEmployees}
            icon={
              <UserRound
                size={21}
              />
            }
          />

        </div>

        {/* =================================================
            ERROR MESSAGE
        ================================================= */}

        {error && (
          <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-white px-4 py-3 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50">
                <AlertTriangle
                  size={16}
                  className="text-[#E83B32]"
                />
              </div>

              <span className="text-sm font-medium text-[#E83B32]">
                {error}
              </span>

            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-[#E83B32]"
              aria-label="Close error"
            >
              <X size={17} />
            </button>

          </div>
        )}

        {/* =================================================
            SUCCESS MESSAGE
        ================================================= */}

        {successMessage && (
          <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-blue-200 bg-white px-4 py-3 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF4FF]">
                <Check
                  size={17}
                  className="text-[#1D55B8]"
                />
              </div>

              <span className="text-sm font-semibold text-[#1D55B8]">
                {successMessage}
              </span>

            </div>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage("")
              }
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-[#EEF4FF] hover:text-[#1D55B8]"
              aria-label="Close success message"
            >
              <X size={17} />
            </button>

          </div>
        )}

        {/* =================================================
            FILTERS
        ================================================= */}

        <div className="mb-5 rounded-2xl border border-[#D5E2F7] bg-white p-4 shadow-sm">

          <div className="flex flex-col gap-3 md:flex-row">

            <div className="relative flex-1">

              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search by name, email or department..."
                className="
                  w-full
                  rounded-xl
                  border
                  border-[#D5E2F7]
                  bg-[#F6F9FF]
                  py-2.5
                  pl-10
                  pr-4
                  text-sm
                  text-[#10275F]
                  outline-none
                  transition
                  placeholder:text-[#94A3B8]
                  focus:border-[#1D55B8]
                  focus:bg-white
                  focus:ring-2
                  focus:ring-[#1D55B8]/10
                "
              />

            </div>

            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(
                  event.target
                    .value as
                    | "ALL"
                    | "ADMIN"
                    | "EMPLOYEE"
                )
              }
              className="
                rounded-xl
                border
                border-[#D5E2F7]
                bg-[#F6F9FF]
                px-4
                py-2.5
                text-sm
                font-semibold
                text-[#10275F]
                outline-none
                transition
                focus:border-[#1D55B8]
                focus:bg-white
                focus:ring-2
                focus:ring-[#1D55B8]/10
              "
            >

              <option value="ALL">
                All Roles
              </option>

              <option value="EMPLOYEE">
                Employees
              </option>

              <option value="ADMIN">
                Administrators
              </option>

            </select>

          </div>

        </div>

        {/* =================================================
            USERS TABLE
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-[#D5E2F7] bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-[#E5ECF7] px-5 py-4">

            <div>

              <h2 className="font-bold text-[#10275F]">
                All Users
              </h2>

              <p className="mt-1 text-xs text-[#64748B]">

                {filteredUsers.length} user
                {filteredUsers.length !==
                1
                  ? "s"
                  : ""}{" "}
                shown

              </p>

            </div>

          </div>

          {filteredUsers.length ===
          0 ? (

            <div className="p-12 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF4FF]">

                <Users
                  size={30}
                  className="text-[#1D55B8]"
                />

              </div>

              <p className="mt-4 text-sm font-bold text-[#10275F]">
                No users found
              </p>

              <p className="mt-1 text-xs text-[#64748B]">
                Try changing your search or filter.
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[950px]">

                <thead>

                  <tr className="border-b border-[#E5ECF7] bg-[#F6F9FF] text-left">

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#64748B]">
                      User
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#64748B]">
                      Department
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#64748B]">
                      Role
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#64748B]">
                      Joined
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#64748B]">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredUsers.map(
                    (user) => {

                      const isCurrentUser =
                        currentUser?.id ===
                        user._id;

                      const isUpdating =
                        updatingUserId ===
                        user._id;

                      const isDeleting =
                        deletingUserId ===
                        user._id;

                      const isEditingEmail =
                        editingEmailUserId ===
                        user._id;

                      const isSavingEmail =
                        savingEmailUserId ===
                        user._id;

                      return (
                        <tr
                          key={user._id}
                          className="
                            border-b
                            border-[#E5ECF7]
                            last:border-0
                            transition
                            hover:bg-[#F6F9FF]
                          "
                        >

                          {/* =================================================
                              USER
                          ================================================= */}

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-3">

                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#102D72] text-sm font-bold text-white">

                                {user.name
                                  .trim()
                                  .split(
                                    /\s+/
                                  )
                                  .map(
                                    (
                                      name
                                    ) =>
                                      name[0]
                                  )
                                  .join("")
                                  .slice(
                                    0,
                                    2
                                  )
                                  .toUpperCase()}

                              </div>

                              <div className="min-w-0">

                                <div className="flex items-center gap-2">

                                  <p className="text-sm font-semibold text-[#10275F]">
                                    {user.name}
                                  </p>

                                  {isCurrentUser && (
                                    <span className="rounded-full bg-[#EEF4FF] px-2 py-0.5 text-[10px] font-bold text-[#1D55B8]">
                                      YOU
                                    </span>
                                  )}

                                </div>

                                {/* EMAIL */}

                                <div className="mt-1 flex items-center gap-1.5 text-xs text-[#64748B]">

                                  <Mail
                                    size={12}
                                    className="shrink-0 text-[#94A3B8]"
                                  />

                                  {isEditingEmail ? (
                                    <>

                                      <input
                                        type="email"
                                        value={
                                          editingEmail
                                        }
                                        onChange={(
                                          event
                                        ) =>
                                          setEditingEmail(
                                            event
                                              .target
                                              .value
                                          )
                                        }
                                        autoFocus
                                        disabled={
                                          isSavingEmail
                                        }
                                        onKeyDown={(
                                          event
                                        ) => {

                                          if (
                                            event.key ===
                                            "Enter"
                                          ) {
                                            event.preventDefault();

                                            openEmailConfirmation(
                                              user
                                            );
                                          }

                                          if (
                                            event.key ===
                                            "Escape"
                                          ) {
                                            cancelEmailEdit();
                                          }

                                        }}
                                        className="
                                          w-64
                                          rounded-lg
                                          border
                                          border-[#D5E2F7]
                                          bg-white
                                          px-2.5
                                          py-1.5
                                          text-xs
                                          text-[#10275F]
                                          outline-none
                                          focus:border-[#1D55B8]
                                          focus:ring-2
                                          focus:ring-[#1D55B8]/10
                                          disabled:bg-slate-50
                                        "
                                      />

                                      <button
                                        type="button"
                                        title="Save email"
                                        aria-label="Save email"
                                        onClick={() =>
                                          openEmailConfirmation(
                                            user
                                          )
                                        }
                                        disabled={
                                          isSavingEmail
                                        }
                                        className="
                                          rounded-md
                                          p-1
                                          text-[#1D55B8]
                                          transition
                                          hover:bg-[#EEF4FF]
                                          disabled:cursor-not-allowed
                                          disabled:opacity-40
                                        "
                                      >
                                        <Check
                                          size={14}
                                        />
                                      </button>

                                      <button
                                        type="button"
                                        title="Cancel email edit"
                                        aria-label="Cancel email edit"
                                        onClick={
                                          cancelEmailEdit
                                        }
                                        disabled={
                                          isSavingEmail
                                        }
                                        className="
                                          rounded-md
                                          p-1
                                          text-[#94A3B8]
                                          transition
                                          hover:bg-[#EEF4FF]
                                          hover:text-[#10275F]
                                          disabled:cursor-not-allowed
                                          disabled:opacity-40
                                        "
                                      >
                                        <X
                                          size={14}
                                        />
                                      </button>

                                    </>
                                  ) : (
                                    <>

                                      <span className="break-all">
                                        {user.email}
                                      </span>

                                      <button
                                        type="button"
                                        title="Edit email"
                                        aria-label={`Edit email for ${user.name}`}
                                        onClick={() =>
                                          startEmailEdit(
                                            user
                                          )
                                        }
                                        disabled={
                                          isDeleting ||
                                          isUpdating
                                        }
                                        className="
                                          ml-1
                                          rounded-md
                                          p-1
                                          text-[#94A3B8]
                                          transition
                                          hover:bg-[#EEF4FF]
                                          hover:text-[#1D55B8]
                                          disabled:cursor-not-allowed
                                          disabled:opacity-40
                                        "
                                      >
                                        <Pencil
                                          size={13}
                                        />
                                      </button>

                                    </>
                                  )}

                                </div>

                              </div>

                            </div>

                          </td>

                          {/* =================================================
                              DEPARTMENT
                          ================================================= */}

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-2 text-sm text-[#64748B]">

                              <Building2
                                size={15}
                                className="text-[#1D55B8]"
                              />

                              {user.department ||
                                "Not specified"}

                            </div>

                          </td>

                          {/* =================================================
                              ROLE
                          ================================================= */}

                          <td className="px-5 py-4">

                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                                user.role ===
                                "ADMIN"
                                  ? "border border-blue-200 bg-[#EEF4FF] text-[#1D55B8]"
                                  : "border border-slate-200 bg-slate-50 text-slate-600"
                              }`}
                            >

                              {user.role ===
                              "ADMIN" ? (
                                <ShieldCheck
                                  size={12}
                                />
                              ) : (
                                <UserRound
                                  size={12}
                                />
                              )}

                              {user.role}

                            </span>

                          </td>

                          {/* =================================================
                              JOINED
                          ================================================= */}

                          <td className="px-5 py-4 text-sm text-[#64748B]">

                            {new Date(
                              user.createdAt
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )}

                          </td>

                          {/* =================================================
                              ACTION
                          ================================================= */}

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-2">

                              {/* ROLE DROPDOWN */}

                              {isCurrentUser ? (

                                <div className="flex items-center gap-2 rounded-lg border border-[#D5E2F7] bg-[#F6F9FF] px-3 py-2 text-xs font-semibold text-[#64748B]">

                                  <Lock
                                    size={13}
                                    className="text-[#1D55B8]"
                                  />

                                  {user.role ===
                                  "ADMIN"
                                    ? "Admin"
                                    : "Employee"}

                                </div>

                              ) : (

                                <select
                                  value={
                                    user.role
                                  }
                                  disabled={
                                    isUpdating ||
                                    isDeleting ||
                                    isSavingEmail
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    changeRole(
                                      user._id,
                                      event
                                        .target
                                        .value as
                                        | "ADMIN"
                                        | "EMPLOYEE"
                                    )
                                  }
                                  className="
                                    rounded-lg
                                    border
                                    border-[#D5E2F7]
                                    bg-white
                                    px-3
                                    py-2
                                    text-xs
                                    font-semibold
                                    text-[#10275F]
                                    outline-none
                                    transition
                                    focus:border-[#1D55B8]
                                    focus:ring-2
                                    focus:ring-[#1D55B8]/10
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                  "
                                >

                                  <option value="EMPLOYEE">
                                    Employee
                                  </option>

                                  <option value="ADMIN">
                                    Admin
                                  </option>

                                </select>

                              )}

                              {/* DELETE BUTTON */}

                              {!isCurrentUser && (
                                <button
                                  type="button"
                                  title={`Delete ${user.name}`}
                                  aria-label={`Delete ${user.name}`}
                                  disabled={
                                    isUpdating ||
                                    isDeleting ||
                                    isSavingEmail
                                  }
                                  onClick={() =>
                                    openDeleteConfirmation(
                                      user
                                    )
                                  }
                                  className="
                                    flex
                                    h-9
                                    w-9
                                    items-center
                                    justify-center
                                    rounded-lg
                                    border
                                    border-red-200
                                    bg-white
                                    text-[#E83B32]
                                    transition
                                    hover:bg-red-50
                                    hover:border-red-300
                                    disabled:cursor-not-allowed
                                    disabled:opacity-40
                                  "
                                >

                                  {isDeleting ? (
                                    <RefreshCw
                                      size={16}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Trash2
                                      size={16}
                                    />
                                  )}

                                </button>
                              )}

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </main>

      {/* =====================================================
          EMAIL UPDATE CONFIRMATION MODAL
      ===================================================== */}

      {emailConfirmationUser && (
        <div
          className="
            fixed
            inset-0
            z-[110]
            flex
            items-center
            justify-center
            bg-[#071B45]/60
            px-4
            backdrop-blur-[2px]
          "
          onClick={
            closeEmailConfirmation
          }
        >

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-email-title"
            className="
              w-full
              max-w-md
              rounded-2xl
              border
              border-[#D5E2F7]
              bg-white
              p-6
              shadow-2xl
            "
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="flex items-start justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4FF]">

                  <Pencil
                    size={21}
                    className="text-[#1D55B8]"
                  />

                </div>

                <div>

                  <h2
                    id="edit-email-title"
                    className="text-lg font-bold text-[#10275F]"
                  >
                    Update Email?
                  </h2>

                  <p className="mt-0.5 text-xs text-[#64748B]">
                    Please confirm this change.
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={
                  closeEmailConfirmation
                }
                disabled={
                  !!savingEmailUserId
                }
                className="
                  rounded-lg
                  p-1.5
                  text-[#94A3B8]
                  transition
                  hover:bg-[#EEF4FF]
                  hover:text-[#10275F]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
                aria-label="Close"
              >
                <X size={18} />
              </button>

            </div>

            <div className="mt-6 rounded-xl border border-[#D5E2F7] bg-[#F6F9FF] p-4">

              <p className="text-sm font-semibold text-[#10275F]">
                Are you sure you want to change this email?
              </p>

              <div className="mt-4 space-y-3">

                <div>

                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">
                    Current email
                  </p>

                  <p className="mt-1 break-all text-sm text-[#64748B]">
                    {
                      emailConfirmationUser.email
                    }
                  </p>

                </div>

                <div className="border-t border-[#D5E2F7] pt-3">

                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">
                    New email
                  </p>

                  <p className="mt-1 break-all text-sm font-bold text-[#10275F]">
                    {
                      emailConfirmationNewEmail
                    }
                  </p>

                </div>

              </div>

              <p className="mt-4 text-xs leading-5 text-[#64748B]">
                This will update the user's email address in the database. The new address will be used for future login and booking communication.
              </p>

            </div>

            <div className="mt-6 flex justify-end gap-3">

              <button
                type="button"
                onClick={
                  closeEmailConfirmation
                }
                disabled={
                  !!savingEmailUserId
                }
                className="
                  rounded-xl
                  border
                  border-[#D5E2F7]
                  bg-white
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-[#475569]
                  transition
                  hover:bg-[#F6F9FF]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleEmailUpdate
                }
                disabled={
                  !!savingEmailUserId
                }
                className="
                  flex
                  min-w-[160px]
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[#102D72]
                  px-4
                  py-2.5
                  text-sm
                  font-bold
                  text-white
                  transition
                  hover:bg-[#0C245C]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >

                {savingEmailUserId ? (
                  <>
                    <RefreshCw
                      size={15}
                      className="animate-spin"
                    />

                    Updating...
                  </>
                ) : (
                  <>
                    <Check size={15} />

                    Yes, Update Email
                  </>
                )}

              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          DELETE CONFIRMATION MODAL
      ===================================================== */}

      {deleteUser && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-[#071B45]/60
            px-4
            backdrop-blur-[2px]
          "
          onClick={
            closeDeleteConfirmation
          }
        >

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            className="
              w-full
              max-w-md
              rounded-2xl
              border
              border-[#D5E2F7]
              bg-white
              p-6
              shadow-2xl
            "
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="flex items-start justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">

                  <AlertTriangle
                    size={22}
                    className="text-[#E83B32]"
                  />

                </div>

                <div>

                  <h2
                    id="delete-user-title"
                    className="text-lg font-bold text-[#10275F]"
                  >
                    Delete User?
                  </h2>

                  <p className="mt-0.5 text-xs text-[#64748B]">
                    This action requires confirmation.
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={
                  closeDeleteConfirmation
                }
                disabled={
                  !!deletingUserId
                }
                className="
                  rounded-lg
                  p-1.5
                  text-[#94A3B8]
                  transition
                  hover:bg-[#EEF4FF]
                  hover:text-[#10275F]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
                aria-label="Close"
              >
                <X size={18} />
              </button>

            </div>

            <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4">

              <p className="text-sm leading-6 text-[#64748B]">

                Are you sure you want to delete{" "}

                <span className="font-bold text-[#10275F]">
                  {deleteUser.name}
                </span>

                ?

              </p>

              <p className="mt-2 text-xs leading-5 text-[#E83B32]">
                The user will no longer be able to access the conference room booking system.
              </p>

            </div>

            <div className="mt-6 flex justify-end gap-3">

              <button
                type="button"
                onClick={
                  closeDeleteConfirmation
                }
                disabled={
                  !!deletingUserId
                }
                className="
                  rounded-xl
                  border
                  border-[#D5E2F7]
                  bg-white
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-[#475569]
                  transition
                  hover:bg-[#F6F9FF]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleDeleteUser
                }
                disabled={
                  !!deletingUserId
                }
                className="
                  flex
                  min-w-[120px]
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[#E83B32]
                  px-4
                  py-2.5
                  text-sm
                  font-bold
                  text-white
                  transition
                  hover:bg-[#CF3028]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >

                {deletingUserId ? (
                  <>
                    <RefreshCw
                      size={15}
                      className="animate-spin"
                    />

                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />

                    Delete User
                  </>
                )}

              </button>

            </div>

          </div>

        </div>
      )}

    </>
  );
}

/* =====================================================
   STAT CARD
===================================================== */

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#D5E2F7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

      <div className="flex items-center gap-3">

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D55B8]">
          {icon}
        </div>

        <div>

          <p className="text-sm font-semibold text-[#64748B]">
            {title}
          </p>

          <p className="mt-1 text-2xl font-bold text-[#10275F]">
            {value}
          </p>

        </div>

      </div>

    </div>
  );
}