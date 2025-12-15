import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Plus, Car, Wrench, DollarSign, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

import VehicleCard from "../components/dashboard/VehicleCard";
import StatCard from "../components/dashboard/StatCard";
import UpcomingReminders from "../components/dashboard/UpcomingReminders";
import RecentActivity from "../components/dashboard/RecentActivity";
import AddVehicleDialog from "../components/vehicle/AddVehicleDialog";

export default function Dashboard() {
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.filter({ is_active: true }),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['maintenanceLogs'],
    queryFn: () => base44.entities.MaintenanceLog.list('-date', 100),
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => base44.entities.Reminder.filter({ status: 'pending' }),
  });

  const createVehicleMutation = useMutation({
    mutationFn: (data) => base44.entities.Vehicle.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setShowAddVehicle(false);
    },
  });

  const subscriptionTier = user?.subscription_tier || 'free';
  const canAddVehicle = subscriptionTier === 'paid' || vehicles.length === 0;

  const totalSpent = logs.reduce((sum, log) => sum + (log.cost || 0), 0);
  const pendingReminders = reminders.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-slate-500 mt-1">
              Manage your vehicles and track maintenance
            </p>
          </div>
          <div className="flex gap-2">
            {!user?.is_mechanic && (
              <Link to={createPageUrl('MechanicSetup')}>
                <Button variant="outline" className="flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  <span className="hidden sm:inline">Become a Mechanic</span>
                </Button>
              </Link>
            )}
            <Button 
              onClick={() => setShowAddVehicle(true)}
              className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            icon={Car} 
            label="Vehicles" 
            value={vehicles.length}
            color="blue"
            index={0}
          />
          <StatCard 
            icon={Wrench} 
            label="Total Services" 
            value={logs.length}
            color="green"
            index={1}
          />
          <StatCard 
            icon={DollarSign} 
            label="Total Spent" 
            value={`$${totalSpent.toLocaleString()}`}
            color="orange"
            index={2}
          />
          <StatCard 
            icon={Bell} 
            label="Reminders" 
            value={pendingReminders}
            color="purple"
            index={3}
          />
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Vehicles Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">My Vehicles</h2>
            </div>
            
            {loadingVehicles ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {[1, 2].map(i => (
                  <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" />
                ))}
              </div>
            ) : vehicles.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl p-12 text-center shadow-sm"
              >
                <div className="w-16 h-16 rounded-full bg-blue-50 mx-auto flex items-center justify-center mb-4">
                  <Car className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No vehicles yet</h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                  Add your first vehicle to start tracking maintenance and service history
                </p>
                <Button 
                  onClick={() => setShowAddVehicle(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Vehicle
                </Button>
              </motion.div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {vehicles.map((vehicle, index) => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} index={index} />
                ))}
              </div>
            )}

            {/* Recent Activity */}
            <RecentActivity logs={logs} vehicles={vehicles} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <UpcomingReminders reminders={reminders} vehicles={vehicles} />
            
            {/* Subscription Card */}
            {subscriptionTier === 'free' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl shadow-blue-600/25"
              >
                <h3 className="font-semibold text-lg mb-2">Upgrade to Premium</h3>
                <p className="text-blue-100 text-sm mb-4">
                  Unlock unlimited vehicles, advanced reminders, and more features.
                </p>
                <ul className="text-sm text-blue-100 space-y-2 mb-4">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                    Unlimited vehicles
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                    Export service history
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                    Predictive maintenance
                  </li>
                </ul>
                <Button className="w-full bg-white text-blue-600 hover:bg-blue-50">
                  Upgrade Now
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <AddVehicleDialog 
        open={showAddVehicle} 
        onClose={() => setShowAddVehicle(false)}
        onSave={(data) => createVehicleMutation.mutate(data)}
        canAddVehicle={canAddVehicle}
      />
    </div>
  );
}