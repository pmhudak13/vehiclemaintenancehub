import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wrench, Car, Search, Calendar, Gauge, 
  ChevronRight, MapPin, User, Clock, CalendarDays, Settings as SettingsIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import UpcomingRemindersWidget from "../components/mechanic/UpcomingRemindersWidget";
import AppointmentCalendar from "../components/mechanic/AppointmentCalendar";
import ScheduleAppointmentDialog from "../components/mechanic/ScheduleAppointmentDialog";
import AppointmentDetailDialog from "../components/mechanic/AppointmentDetailDialog";
import AvailabilitySettings from "../components/mechanic/AvailabilitySettings";

export default function MechanicDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("vehicles");
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showAppointmentDetail, setShowAppointmentDetail] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['mechanicAssignments'],
    queryFn: () => base44.entities.MechanicAssignment.filter({ 
      mechanic_id: user?.id,
      status: 'active' 
    }),
    enabled: !!user?.id,
  });

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['assignedVehicles'],
    queryFn: async () => {
      const vehicleIds = assignments.map(a => a.vehicle_id);
      if (vehicleIds.length === 0) return [];
      const vehicles = await Promise.all(
        vehicleIds.map(id => base44.entities.Vehicle.filter({ id }))
      );
      return vehicles.flat();
    },
    enabled: assignments.length > 0,
  });

  const { data: allLogs = [] } = useQuery({
    queryKey: ['mechanicLogs'],
    queryFn: async () => {
      const vehicleIds = assignments.map(a => a.vehicle_id);
      if (vehicleIds.length === 0) return [];
      const logs = await Promise.all(
        vehicleIds.map(id => base44.entities.MaintenanceLog.filter({ vehicle_id: id }, '-date', 10))
      );
      return logs.flat();
    },
    enabled: assignments.length > 0,
  });

  const { data: allReminders = [] } = useQuery({
    queryKey: ['mechanicReminders'],
    queryFn: async () => {
      const vehicleIds = assignments.map(a => a.vehicle_id);
      if (vehicleIds.length === 0) return [];
      const reminders = await Promise.all(
        vehicleIds.map(id => base44.entities.Reminder.filter({ vehicle_id: id, status: 'pending' }))
      );
      return reminders.flat();
    },
    enabled: assignments.length > 0,
  });

  const filteredVehicles = allVehicles.filter(vehicle => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      vehicle.make?.toLowerCase().includes(search) ||
      vehicle.model?.toLowerCase().includes(search) ||
      vehicle.year?.toString().includes(search) ||
      vehicle.vin?.toLowerCase().includes(search)
    );
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['mechanicAppointments'],
    queryFn: () => base44.entities.Appointment.filter({ mechanic_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: availability = [] } = useQuery({
    queryKey: ['mechanicAvailability'],
    queryFn: () => base44.entities.MechanicAvailability.filter({ mechanic_id: user?.id }),
    enabled: !!user?.id,
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (data) => base44.entities.Appointment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mechanicAppointments'] });
      setShowScheduleDialog(false);
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Appointment.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mechanicAppointments'] });
    },
  });

  const saveAvailabilityMutation = useMutation({
    mutationFn: async (schedule) => {
      // Delete existing availability
      for (const avail of availability) {
        await base44.entities.MechanicAvailability.delete(avail.id);
      }
      // Create new availability
      for (const day of schedule) {
        await base44.entities.MechanicAvailability.create(day);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mechanicAvailability'] });
    },
  });

  const recentLogs = [...allLogs]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  const todayLogs = allLogs.filter(log => {
    const logDate = new Date(log.date);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  });

  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDetail(true);
  };

  const handleStatusChange = (appointmentId, newStatus) => {
    updateAppointmentMutation.mutate({ id: appointmentId, status: newStatus });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Mechanic Dashboard
              </h1>
              <p className="text-slate-500">
                {user?.shop_name || 'Welcome back'}
              </p>
            </div>
          </div>
          {user?.shop_name && (
            <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
              {user.shop_address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {user.shop_address}
                </span>
              )}
              {user.shop_phone && (
                <span>{user.shop_phone}</span>
              )}
            </div>
          )}
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Car className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{assignments.length}</p>
            <p className="text-sm text-slate-500 mt-0.5">Active Vehicles</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Wrench className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{todayLogs.length}</p>
            <p className="text-sm text-slate-500 mt-0.5">Today's Services</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{allLogs.length}</p>
            <p className="text-sm text-slate-500 mt-0.5">Total Services</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3">
              <User className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {new Set(assignments.map(a => a.owner_id)).size}
            </p>
            <p className="text-sm text-slate-500 mt-0.5">Customers</p>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="vehicles" className="flex items-center gap-2">
              <Car className="w-4 h-4" />
              Vehicles
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="availability" className="flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              Availability
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles" className="mt-6">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search by make, model, year, or VIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Assigned Vehicles */}
              <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Assigned Vehicles ({filteredVehicles.length})
            </h2>

            {isLoading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
                ))}
              </div>
            ) : filteredVehicles.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-12 pb-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-4">
                    <Car className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {searchQuery ? 'No vehicles found' : 'No assigned vehicles'}
                  </h3>
                  <p className="text-slate-500">
                    {searchQuery 
                      ? 'Try adjusting your search'
                      : 'Vehicle owners will assign vehicles to you for service'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredVehicles.map((vehicle, index) => {
                  const assignment = assignments.find(a => a.vehicle_id === vehicle.id);
                  const vehicleLogs = allLogs.filter(l => l.vehicle_id === vehicle.id);
                  const lastService = vehicleLogs.sort((a, b) => 
                    new Date(b.date) - new Date(a.date)
                  )[0];

                  return (
                    <motion.div
                      key={vehicle.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link to={createPageUrl(`MechanicVehicleDetail?id=${vehicle.id}`)}>
                        <Card className="border-0 shadow-sm hover:shadow-md transition-all group cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
                                  <Car className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-semibold text-slate-900">
                                      {vehicle.year} {vehicle.make} {vehicle.model}
                                    </h3>
                                    {vehicle.trim && (
                                      <Badge variant="secondary" className="text-xs">
                                        {vehicle.trim}
                                      </Badge>
                                    )}
                                  </div>
                                  {assignment && (
                                    <p className="text-sm text-slate-500 mt-0.5">
                                      Owner: {assignment.owner_email}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                    {vehicle.current_mileage && (
                                      <span className="flex items-center gap-1">
                                        <Gauge className="w-3 h-3" />
                                        {vehicle.current_mileage.toLocaleString()} mi
                                      </span>
                                    )}
                                    {vehicle.vin && (
                                      <span className="font-mono">
                                        VIN: ...{vehicle.vin.slice(-6)}
                                      </span>
                                    )}
                                    {lastService && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Last: {format(new Date(lastService.date), 'MMM d')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <UpcomingRemindersWidget reminders={allReminders} vehicles={allVehicles} />
            
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Services</h2>
            
            {recentLogs.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-8 pb-8 text-center">
                  <Wrench className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No services logged yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => {
                  const vehicle = allVehicles.find(v => v.vehicle_id === log.vehicle_id);
                  return (
                    <Card key={log.id} className="border-0 shadow-sm">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                            <Wrench className="w-4 h-4 text-orange-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {log.title || log.service_type?.replace(/_/g, ' ')}
                            </p>
                            {vehicle && (
                              <p className="text-xs text-slate-500 truncate">
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-400">
                                {format(new Date(log.date), 'MMM d, yyyy')}
                              </span>
                              {log.cost > 0 && (
                                <span className="text-xs text-slate-400">
                                  ${log.cost}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <AppointmentCalendar
            appointments={appointments}
            vehicles={allVehicles}
            onNewAppointment={() => setShowScheduleDialog(true)}
            onAppointmentClick={handleAppointmentClick}
          />
        </TabsContent>

        <TabsContent value="availability" className="mt-6">
          <div className="max-w-2xl">
            <AvailabilitySettings
              mechanicId={user?.id}
              availability={availability}
              onSave={(schedule) => saveAvailabilityMutation.mutate(schedule)}
            />
          </div>
        </TabsContent>
      </Tabs>

      <ScheduleAppointmentDialog
        open={showScheduleDialog}
        onClose={() => setShowScheduleDialog(false)}
        mechanicId={user?.id}
        assignments={assignments}
        vehicles={allVehicles}
        onSave={(data) => createAppointmentMutation.mutate(data)}
      />

      <AppointmentDetailDialog
        open={showAppointmentDetail}
        onClose={() => {
          setShowAppointmentDetail(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        vehicle={allVehicles.find(v => v.id === selectedAppointment?.vehicle_id)}
        onStatusChange={handleStatusChange}
      />
    </div>
  </div>
  );
}