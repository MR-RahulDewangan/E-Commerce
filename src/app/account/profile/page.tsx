'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Mail, ShieldCheck, Calendar } from 'lucide-react';

export default function ProfilePage() {
  const { user, openAuthModal, logout } = useAuth();

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <User className="w-12 h-12 mx-auto text-zinc-400" />
        <h2 className="text-xl font-bold text-zinc-900">Sign In Required</h2>
        <p className="text-xs text-zinc-500">Sign in to view your profile settings.</p>
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
          Customer Profile
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Personal account identity and session details.
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-xs space-y-6">
        <div className="flex items-center gap-4 border-b border-zinc-100 pb-6">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xl">
            {user.firstName[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-xs text-zinc-500">{user.email}</p>
            <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
              Account Role: {user.role}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
            <span className="text-zinc-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email Address
            </span>
            <p className="font-semibold text-zinc-900">{user.email}</p>
          </div>

          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
            <span className="text-zinc-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Session Security
            </span>
            <p className="font-semibold text-emerald-700">14-Day Rolling HTTP-Only Cookie Active</p>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-100 flex justify-end">
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-lg transition"
          >
            Sign Out of Account
          </button>
        </div>
      </div>
    </div>
  );
}
