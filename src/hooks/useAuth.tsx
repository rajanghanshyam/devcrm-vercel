import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types";

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  addUser: (user: Partial<User> & { password?: string }) => Promise<void>;
  updateUser: (updatedUser: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  loading: boolean;
  refreshUsers: () => Promise<void>;
  switchUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const FALLBACK_USERS: User[] = [
  {
    id: "admin_default",
    name: "System Administrator",
    email: "admin@application.local",
    password: "pass",
    role: "Admin" as any,
    isActive: true,
    rights: {
      dashboard: true,
      quotations: true,
      proforma: true,
      challans: true,
      leads: true,
      customers: true,
      products: true,
      inventory: true,
      subscriptions: true,
      reminders: true,
      amazonSeller: true,
      catalogues: true,
      settings: true
    }
  },
  {
    id: "rajan_default",
    name: "Rajan Ghanshyam",
    email: "rajan@devinfotech.net",
    password: "Devansh@2007",
    role: "Admin" as any,
    isActive: true,
    rights: {
      dashboard: true,
      quotations: true,
      proforma: true,
      challans: true,
      leads: true,
      customers: true,
      products: true,
      inventory: true,
      subscriptions: true,
      reminders: true,
      amazonSeller: true,
      catalogues: true,
      settings: true
    }
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all users from the backend with local fallback support
  const refreshUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      const data = await res.json();
      if (data.success && data.users && data.users.length > 0) {
        setUsers(data.users || []);
        return data.users;
      } else {
        setUsers(FALLBACK_USERS);
        return FALLBACK_USERS;
      }
    } catch (err) {
      console.warn("Error fetching user list, using local fallback users:", err);
      setUsers(FALLBACK_USERS);
      return FALLBACK_USERS;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      // 1. Fetch users list first
      const loadedUsers = await refreshUsers();
      
      // 2. Check local storage for persistent session
      const storedUser = localStorage.getItem("qm_logged_in_user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          // Sync with loaded users to get latest rights/isActive status
          const matched = loadedUsers?.find((u: any) => u.id === parsed.id);
          if (matched && matched.isActive) {
            setUser(matched);
            localStorage.setItem("qm_logged_in_user", JSON.stringify(matched));
          } else {
            setUser(parsed);
          }
        } catch (e) {
          console.error("Failed to parse stored user:", e);
          localStorage.removeItem("qm_logged_in_user");
        }
      } else {
        // Auto-login default admin in dev/fallback for smoother onboarding if no session exists
        const defaultAdm = loadedUsers?.find((u: any) => u.id === "admin_default") || FALLBACK_USERS[0];
        setUser(defaultAdm);
        localStorage.setItem("qm_logged_in_user", JSON.stringify(defaultAdm));
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password?: string) => {
    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: password || "" })
      });
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Login failed");
      }
      
      setUser(data.user);
      localStorage.setItem("qm_logged_in_user", JSON.stringify(data.user));
      await refreshUsers();
      return true;
    } catch (err: any) {
      console.warn("Server login failed, attempting local fallback validation:", err);
      const matched = FALLBACK_USERS.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === (password || "")
      );
      if (matched) {
        if (!matched.isActive) {
          throw new Error("This user account is inactive");
        }
        setUser(matched);
        localStorage.setItem("qm_logged_in_user", JSON.stringify(matched));
        setUsers(FALLBACK_USERS);
        return true;
      }
      throw new Error(err.message || "Incorrect email address or password");
    }
  };

  const logout = async () => {
    localStorage.removeItem("qm_logged_in_user");
    setUser(null);
  };

  const switchUser = (u: User) => {
    setUser(u);
    localStorage.setItem("qm_logged_in_user", JSON.stringify(u));
  };

  const addUser = async (userData: Partial<User> & { password?: string }) => {
    const res = await fetch("/api/users/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        rights: userData.rights
      })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to create user");
    }
    await refreshUsers();
  };

  const updateUser = async (updatedUser: User) => {
    const res = await fetch("/api/users/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: updatedUser.id,
        name: updatedUser.name,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        password: updatedUser.password,
        rights: updatedUser.rights
      })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to update user");
    }
    await refreshUsers();
    
    // If updating current user's profile, sync context
    if (user && user.id === updatedUser.id) {
      const freshUser = { ...user, ...updatedUser };
      setUser(freshUser);
      localStorage.setItem("qm_logged_in_user", JSON.stringify(freshUser));
    }
  };

  const deleteUser = async (id: string) => {
    const res = await fetch("/api/users/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to delete user");
    }
    await refreshUsers();
    
    // If the active user got deleted, auto-switch to someone else
    if (user && user.id === id) {
      const remainingUsers = users.filter(u => u.id !== id && u.isActive);
      if (remainingUsers.length > 0) {
        switchUser(remainingUsers[0]);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser,
        loading,
        refreshUsers,
        switchUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
