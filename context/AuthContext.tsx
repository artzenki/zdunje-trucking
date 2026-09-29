"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { AppUser, AppModule, UserRole, ROLE_DEFAULT_PERMISSIONS } from "@/types/fleet";
import { initialUsers } from "@/lib/mockData";

interface AuthContextType {
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDemoUser: (user: AppUser) => void;
  signup: (
    email: string,
    password: string,
    name: string,
    role: UserRole
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasPermission: (module: AppModule, action: "view" | "create" | "edit" | "delete") => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    if (typeof window !== "undefined") {
      const explicitLogout = localStorage.getItem("zdunje_explicit_logout");
      if (explicitLogout === "true") return null;
      const savedUserJson = localStorage.getItem("zdunje_auth_user");
      if (savedUserJson) {
        try {
          return JSON.parse(savedUserJson) as AppUser;
        } catch {
          // ignore
        }
      }
    }
    return initialUsers[0]; // Instant Super Admin session by default
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load existing session or fallback from local storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const explicitLogout = localStorage.getItem("zdunje_explicit_logout");
        if (explicitLogout === "true") {
          setCurrentUser(null);
          setIsLoading(false);
          return;
        }

        // 1. Check local storage for active user session first
        const savedUserJson = localStorage.getItem("zdunje_auth_user");
        if (savedUserJson) {
          try {
            const parsed = JSON.parse(savedUserJson) as AppUser;
            setCurrentUser(parsed);
            setIsLoading(false);
            return;
          } catch {
            // ignore
          }
        }

        // 2. Check Supabase Auth session if configured with timeout
        if (supabase) {
          try {
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
              setTimeout(() => resolve({ data: { session: null } }), 1200)
            );
            const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
            if (session?.user) {
              const { data: profile } = await supabase
                .from("user_profiles")
                .select("*")
                .eq("id", session.user.id)
                .maybeSingle();

              if (profile) {
                const appUser: AppUser = {
                  id: profile.id,
                  name: profile.name || session.user.email?.split("@")[0] || "Team Member",
                  email: profile.email || session.user.email || "",
                  phone: profile.phone || "",
                  role: (profile.role as UserRole) || "Dispatcher",
                  department: profile.department || "Operations",
                  status: profile.status || "Active",
                  permissions: profile.permissions || ROLE_DEFAULT_PERMISSIONS["Dispatcher"],
                  createdAt: profile.created_at || new Date().toISOString(),
                  notes: profile.notes || "",
                };
                setCurrentUser(appUser);
                localStorage.setItem("zdunje_auth_user", JSON.stringify(appUser));
                setIsLoading(false);
                return;
              }
            }
          } catch (e) {
            console.error("Supabase session check error:", e);
          }
        }

        // 3. Fallback: default to Super Admin
        const defaultAdmin = initialUsers[0];
        setCurrentUser(defaultAdmin);
        localStorage.setItem("zdunje_auth_user", JSON.stringify(defaultAdmin));
      } catch (err) {
        console.error("Failed to restore auth session:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen to Supabase auth state changes
    if (supabase) {
      const client = supabase;
      const { data: authListener } = client.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_OUT") {
          setCurrentUser(null);
          localStorage.removeItem("zdunje_auth_user");
        } else if (session?.user && event === "SIGNED_IN") {
          const { data: profile } = await client
            .from("user_profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profile) {
            const appUser: AppUser = {
              id: profile.id,
              name: profile.name || session.user.email?.split("@")[0] || "Team Member",
              email: profile.email || session.user.email || "",
              phone: profile.phone || "",
              role: (profile.role as UserRole) || "Dispatcher",
              department: profile.department || "Operations",
              status: profile.status || "Active",
              permissions: profile.permissions || ROLE_DEFAULT_PERMISSIONS["Dispatcher"],
              createdAt: profile.created_at || new Date().toISOString(),
              notes: profile.notes || "",
            };
            setCurrentUser(appUser);
            localStorage.setItem("zdunje_auth_user", JSON.stringify(appUser));
          }
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  // Login via Supabase Auth or matching email
  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    localStorage.removeItem("zdunje_explicit_logout");
    try {
      // If supabase is available and password provided, authenticate with Supabase Auth
      if (supabase && password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (!error && data.user) {
          // Fetch or upsert profile
          let { data: profile } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", data.user.id)
            .maybeSingle();

          if (!profile) {
            // Check if matches initialUsers
            const matchedInitial = initialUsers.find(
              (u) => u.email.toLowerCase() === email.toLowerCase()
            );

            const newProfile = {
              id: data.user.id,
              email: data.user.email || email,
              name: matchedInitial ? matchedInitial.name : email.split("@")[0],
              role: matchedInitial ? matchedInitial.role : "Dispatcher",
              department: matchedInitial ? matchedInitial.department : "Operations",
              permissions: matchedInitial
                ? matchedInitial.permissions
                : ROLE_DEFAULT_PERMISSIONS["Dispatcher"],
              status: "Active",
              last_active: "Just now",
            };

            const { data: createdProfile } = await supabase
              .from("user_profiles")
              .insert(newProfile)
              .select("*")
              .single();
            profile = createdProfile;
          }

          if (profile) {
            const appUser: AppUser = {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              phone: profile.phone || "",
              role: profile.role as UserRole,
              department: profile.department,
              status: profile.status,
              permissions: profile.permissions || ROLE_DEFAULT_PERMISSIONS[profile.role as UserRole],
              createdAt: profile.created_at || new Date().toISOString(),
              notes: profile.notes || "",
            };
            setCurrentUser(appUser);
            localStorage.setItem("zdunje_auth_user", JSON.stringify(appUser));
            setIsLoading(false);
            return { success: true };
          }
        }
      }

      // Local / Offline fallback: check registered team accounts
      const savedUsersJson = localStorage.getItem("zdunje_users");
      const teamPool: AppUser[] = savedUsersJson ? JSON.parse(savedUsersJson) : initialUsers;
      const matched = teamPool.find(
        (u) => u.email.toLowerCase() === email.toLowerCase().trim()
      );

      if (matched) {
        if (matched.status === "Suspended") {
          setIsLoading(false);
          return { success: false, error: "This account has been suspended by administration." };
        }
        setCurrentUser(matched);
        localStorage.setItem("zdunje_auth_user", JSON.stringify(matched));
        setIsLoading(false);
        return { success: true };
      }

      // If user typed any valid email with demo password, auto-create Dispatcher session
      if (email.includes("@")) {
        const newUser: AppUser = {
          id: `usr_${Date.now()}`,
          name: email.split("@")[0].replace(/[^a-zA-Z0-9]/g, " "),
          email: email.trim(),
          role: "Dispatcher",
          status: "Active",
          department: "Operations & Dispatch",
          createdAt: new Date().toISOString().split("T")[0],
          permissions: ROLE_DEFAULT_PERMISSIONS["Dispatcher"],
        };
        setCurrentUser(newUser);
        localStorage.setItem("zdunje_auth_user", JSON.stringify(newUser));
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: "Invalid email address or credentials." };
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      return { success: false, error: msg };
    }
  };

  // Instant 1-click Demo Account Switcher
  const loginAsDemoUser = (user: AppUser) => {
    localStorage.removeItem("zdunje_explicit_logout");
    setCurrentUser(user);
    localStorage.setItem("zdunje_auth_user", JSON.stringify(user));
  };

  // Sign up for new employee / account
  const signup = async (
    email: string,
    password: string,
    name: string,
    role: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    localStorage.removeItem("zdunje_explicit_logout");
    try {
      if (supabase && password) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { name, role },
          },
        });

        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }

        if (data.user) {
          const profilePayload = {
            id: data.user.id,
            email: email.trim(),
            name: name.trim(),
            role,
            department: role === "Safety Manager" ? "Safety" : role === "Maintenance Tech" ? "Maintenance" : "Operations",
            permissions: ROLE_DEFAULT_PERMISSIONS[role] || ROLE_DEFAULT_PERMISSIONS["Dispatcher"],
            status: "Active",
            last_active: "Just now",
          };

          await supabase.from("user_profiles").upsert(profilePayload);
        }
      }

      // Add to local users pool
      const newUser: AppUser = {
        id: `usr_${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
        role,
        department: role === "Safety Manager" ? "Safety" : role === "Maintenance Tech" ? "Maintenance" : "Operations",
        status: "Active",
        createdAt: new Date().toISOString().split("T")[0],
        permissions: ROLE_DEFAULT_PERMISSIONS[role] || ROLE_DEFAULT_PERMISSIONS["Dispatcher"],
      };

      setCurrentUser(newUser);
      localStorage.setItem("zdunje_auth_user", JSON.stringify(newUser));

      // Append to team pool
      const savedUsersJson = localStorage.getItem("zdunje_users");
      const teamPool: AppUser[] = savedUsersJson ? JSON.parse(savedUsersJson) : initialUsers;
      if (!teamPool.some((u) => u.email.toLowerCase() === newUser.email.toLowerCase())) {
        localStorage.setItem("zdunje_users", JSON.stringify([newUser, ...teamPool]));
      }

      setIsLoading(false);
      return { success: true };
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : "Failed to register account.";
      return { success: false, error: msg };
    }
  };

  // Logout
  const logout = async () => {
    setIsLoading(true);
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Supabase signOut error:", err);
      }
    }
    setCurrentUser(null);
    localStorage.removeItem("zdunje_auth_user");
    localStorage.setItem("zdunje_explicit_logout", "true");
    setIsLoading(false);
  };

  // Permission Checker
  const hasPermission = useCallback(
    (module: AppModule, action: "view" | "create" | "edit" | "delete"): boolean => {
      if (!currentUser) return false;
      // Super Admin always has full access
      if (currentUser.role === "Super Admin") return true;

      const userPermissions = currentUser.permissions || ROLE_DEFAULT_PERMISSIONS[currentUser.role];
      if (!userPermissions || !userPermissions[module]) return false;

      return !!userPermissions[module][action];
    },
    [currentUser]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        loginAsDemoUser,
        signup,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
