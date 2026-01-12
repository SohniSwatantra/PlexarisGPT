'use client';

import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [internalUserId, setInternalUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    try {
      const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
      const userRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
      if (userId && !localStorage.getItem('userId')) {
        // promote session data to local for persistence
        localStorage.setItem('userId', userId);
        if (userRole) localStorage.setItem('userRole', userRole);
        const email = sessionStorage.getItem('userEmail');
        const name = sessionStorage.getItem('userName');
        if (email) localStorage.setItem('userEmail', email);
        if (name) localStorage.setItem('userName', name);
      }
      
      if (!userId) {
        setLoading(false);
        return;
      }

      // Set user data
      setUser({ id: userId });
      setUserType(userRole || 'customer');
      setInternalUserId(userId);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userName');
    setUser(null);
    setUserType(null);
    setInternalUserId(null);
    window.location.href = '/login';
  };

  return {
    user,
    userType,
    internalUserId,
    loading,
    isAuthenticated: !!internalUserId,
    logout,
  };
}
