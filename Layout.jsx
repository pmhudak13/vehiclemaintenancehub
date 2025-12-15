import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Car, User, LogOut, Settings, Crown, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Layout({ children, currentPageName }) {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const hideNav = ['ReceiveTransfer'].includes(currentPageName);
  const isMechanicMode = ['MechanicDashboard', 'MechanicVehicleDetail'].includes(currentPageName);

  if (hideNav) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className={`border-b border-slate-200 sticky top-0 z-50 ${isMechanicMode ? 'bg-gradient-to-r from-orange-600 to-orange-500' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link 
              to={createPageUrl(isMechanicMode ? 'MechanicDashboard' : 'Dashboard')} 
              className="flex items-center gap-2"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isMechanicMode ? 'bg-white/20' : 'bg-blue-600'}`}>
                {isMechanicMode ? (
                  <Wrench className="w-5 h-5 text-white" />
                ) : (
                  <Car className="w-5 h-5 text-white" />
                )}
              </div>
              <span className={`font-bold text-xl hidden sm:block ${isMechanicMode ? 'text-white' : 'text-slate-900'}`}>
                {isMechanicMode ? 'AutoCare Pro' : 'AutoCare'}
              </span>
            </Link>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {isMechanicMode && (
                <Badge className="bg-white/20 text-white border-white/30 hidden sm:flex">
                  Mechanic Mode
                </Badge>
              )}
              
              {user?.is_mechanic && !isMechanicMode && (
                <Link to={createPageUrl('MechanicDashboard')}>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    <span className="hidden sm:inline">Mechanic Mode</span>
                  </Button>
                </Link>
              )}

              {user?.is_mechanic && isMechanicMode && (
                <Link to={createPageUrl('Dashboard')}>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 text-white hover:bg-white/10">
                    <Car className="w-4 h-4" />
                    <span className="hidden sm:inline">Owner Mode</span>
                  </Button>
                </Link>
              )}
              
              {user?.subscription_tier === 'paid' && !isMechanicMode && (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                  <Crown className="w-3 h-3" />
                  Premium
                </span>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className={`flex items-center gap-2 ${isMechanicMode ? 'text-white hover:bg-white/10' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isMechanicMode ? 'bg-white/20' : 'bg-slate-100'}`}>
                      <User className={`w-4 h-4 ${isMechanicMode ? 'text-white' : 'text-slate-600'}`} />
                    </div>
                    <span className={`hidden sm:block text-sm font-medium ${isMechanicMode ? 'text-white' : 'text-slate-700'}`}>
                      {user?.full_name || 'Account'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.full_name}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                    {user?.is_mechanic && user?.shop_name && (
                      <p className="text-xs text-slate-500 mt-0.5">{user.shop_name}</p>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  {!isMechanicMode && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Settings')} className="cursor-pointer">
                          <Settings className="w-4 h-4 mr-2" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      {user?.subscription_tier !== 'paid' && (
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('Subscription')} className="cursor-pointer text-blue-600">
                            <Crown className="w-4 h-4 mr-2" />
                            Upgrade to Premium
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem 
                    className="text-red-600 cursor-pointer"
                    onClick={() => base44.auth.logout()}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}