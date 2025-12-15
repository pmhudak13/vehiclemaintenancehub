import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Plus, Car, Gauge, Calendar, Settings, 
  Bell, Wrench, Send, MoreVertical, Trash2, Pencil, Download 
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import MaintenanceLogCard from "../components/vehicle/MaintenanceLogCard";
import AddLogDialog from "../components/vehicle/AddLogDialog";
import AddReminderDialog from "../components/vehicle/AddReminderDialog";
import TransferDialog from "../components/vehicle/TransferDialog";
import LogDetailDialog from "../components/vehicle/LogDetailDialog";
import AssignMechanicDialog from "../components/vehicle/AssignMechanicDialog";
import ExportPDFButton from "../components/vehicle/ExportPDFButton";
import UnitConverter from "../components/vehicle/UnitConverter";

export default function VehicleDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const vehicleId = urlParams.get('id');
  
  const [showAddLog, setShowAddLog] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showAssignMechanic, setShowAssignMechanic] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [transferCode, setTransferCode] = useState(null);
  const [showUnitConverter, setShowUnitConverter] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: async () => {
      const vehicles = await base44.entities.Vehicle.filter({ id: vehicleId });
      return vehicles[0];
    },
    enabled: !!vehicleId,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['vehicleLogs', vehicleId],
    queryFn: () => base44.entities.MaintenanceLog.filter({ vehicle_id: vehicleId }, '-date'),
    enabled: !!vehicleId,
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['vehicleReminders', vehicleId],
    queryFn: () => base44.entities.Reminder.filter({ vehicle_id: vehicleId }),
    enabled: !!vehicleId,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: mechanicAssignments = [] } = useQuery({
    queryKey: ['vehicleMechanics', vehicleId],
    queryFn: () => base44.entities.MechanicAssignment.filter({ 
      vehicle_id: vehicleId,
      status: 'active'
    }),
    enabled: !!vehicleId,
  });

  const createLogMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.MaintenanceLog.create(data);
      if (data.mileage && vehicle && data.mileage > (vehicle.current_mileage || 0)) {
        await base44.entities.Vehicle.update(vehicleId, { current_mileage: data.mileage });
      }
      
      // Auto-reset matching recurring reminders
      const matchingReminders = reminders.filter(r => 
        r.service_type === data.service_type && 
        r.is_recurring && 
        r.status === 'pending'
      );
      
      for (const reminder of matchingReminders) {
        const updates = {
          status: 'pending',
          last_completed_date: data.date,
          last_completed_mileage: data.mileage
        };
        
        if (reminder.interval_months && reminder.next_due_date) {
          const nextDate = new Date(data.date);
          nextDate.setMonth(nextDate.getMonth() + reminder.interval_months);
          updates.next_due_date = nextDate.toISOString().split('T')[0];
        }
        
        if (reminder.interval_miles && data.mileage) {
          updates.next_due_mileage = data.mileage + reminder.interval_miles;
        }
        
        await base44.entities.Reminder.update(reminder.id, updates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleLogs', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicleReminders', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['maintenanceLogs'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });

  const createReminderMutation = useMutation({
    mutationFn: (data) => base44.entities.Reminder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleReminders', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: (logId) => base44.entities.MaintenanceLog.delete(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleLogs', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['maintenanceLogs'] });
      setSelectedLog(null);
    },
  });

  const completeReminderMutation = useMutation({
    mutationFn: (reminderId) => base44.entities.Reminder.update(reminderId, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleReminders', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });

  const createTransferMutation = useMutation({
    mutationFn: async (code) => {
      await base44.entities.Transfer.create({
        vehicle_id: vehicleId,
        from_user_id: user?.id,
        from_user_email: user?.email,
        transfer_code: code,
        status: 'pending',
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72 hours
        is_used: false,
        vehicle_snapshot: {
          make: vehicle?.make,
          model: vehicle?.model,
          year: vehicle?.year,
          vin: vehicle?.vin
        }
      });
      setTransferCode(code);
    },
  });

  const assignMechanicMutation = useMutation({
    mutationFn: async ({ mechanic, notes }) => {
      await base44.entities.MechanicAssignment.create({
        vehicle_id: vehicleId,
        mechanic_id: mechanic.id,
        mechanic_email: mechanic.email,
        owner_id: user?.id,
        owner_email: user?.email,
        status: 'active',
        notes: notes || undefined,
        assigned_date: new Date().toISOString().split('T')[0],
        vehicle_snapshot: {
          make: vehicle?.make,
          model: vehicle?.model,
          year: vehicle?.year,
          vin: vehicle?.vin
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleMechanics', vehicleId] });
    },
  });

  const removeMechanicMutation = useMutation({
    mutationFn: (assignmentId) => 
      base44.entities.MechanicAssignment.update(assignmentId, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleMechanics', vehicleId] });
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: () => base44.entities.Vehicle.update(vehicleId, { is_active: false }),
    onSuccess: () => {
      window.location.href = createPageUrl('Dashboard');
    },
  });

  const convertUnitMutation = useMutation({
    mutationFn: async (newUnit) => {
      const conversionFactor = (vehicle?.unit || 'miles') === 'miles' ? 1.60934 : 0.621371;
      
      // Update vehicle
      const newMileage = vehicle?.current_mileage ? Math.round(vehicle.current_mileage * conversionFactor) : undefined;
      await base44.entities.Vehicle.update(vehicleId, { 
        unit: newUnit,
        current_mileage: newMileage
      });
      
      // Update all logs
      for (const log of logs) {
        if (log.mileage) {
          await base44.entities.MaintenanceLog.update(log.id, {
            mileage: Math.round(log.mileage * conversionFactor)
          });
        }
      }
      
      // Update all reminders
      for (const reminder of reminders) {
        const updates = {};
        if (reminder.next_due_mileage) {
          updates.next_due_mileage = Math.round(reminder.next_due_mileage * conversionFactor);
        }
        if (reminder.interval_miles) {
          updates.interval_miles = Math.round(reminder.interval_miles * conversionFactor);
        }
        if (Object.keys(updates).length > 0) {
          await base44.entities.Reminder.update(reminder.id, updates);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicleLogs', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicleReminders', vehicleId] });
    },
  });

  const defaultImage = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=400&fit=crop";

  const serviceTypeLabels = {
    oil_change: "Oil Change",
    tire_rotation: "Tire Rotation",
    brake_service: "Brake Service",
    inspection: "Inspection",
    registration: "Registration",
    insurance: "Insurance",
    custom: "Custom"
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Car className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Vehicle not found</p>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="link" className="mt-4">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const pendingReminders = reminders.filter(r => r.status === 'pending');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        <img 
          src={vehicle.image_url || defaultImage} 
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="ghost" size="icon" className="bg-white/10 backdrop-blur-sm text-white hover:bg-white/20">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="bg-white/10 backdrop-blur-sm text-white hover:bg-white/20">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowAssignMechanic(true)}>
                <Wrench className="w-4 h-4 mr-2" />
                Assign Mechanic
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowTransfer(true)}>
                <Send className="w-4 h-4 mr-2" />
                Transfer Vehicle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowUnitConverter(true)}>
                <Gauge className="w-4 h-4 mr-2" />
                Convert {vehicle?.unit === 'miles' ? 'to km' : 'to miles'}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600" onClick={() => deleteVehicleMutation.mutate()}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Vehicle
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="absolute bottom-6 left-4 right-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            {vehicle.trim && (
              <p className="text-white/80 mt-1">{vehicle.trim}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-3">
              {vehicle.current_mileage && (
                <Badge className="bg-white/20 backdrop-blur-sm text-white border-0">
                  <Gauge className="w-3 h-3 mr-1" />
                  {vehicle.current_mileage.toLocaleString()} mi
                </Badge>
              )}
              {vehicle.vin && (
                <Badge className="bg-white/20 backdrop-blur-sm text-white border-0">
                  <Car className="w-3 h-3 mr-1" />
                  {vehicle.vin.slice(-6)}
                </Badge>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Reminders</span>
              {pendingReminders.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-blue-100 text-blue-700 text-xs">
                  {pendingReminders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="mechanics" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">Mechanics</span>
              {mechanicAssignments.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-orange-100 text-orange-700 text-xs">
                  {mechanicAssignments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Details</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Service History ({logs.length})
              </h2>
              <div className="flex gap-2">
                <ExportPDFButton vehicle={vehicle} logs={logs} userTier={user?.subscription_tier} />
                <Button onClick={() => setShowAddLog(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Log
                </Button>
              </div>
            </div>

            {logs.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-4">
                  <Wrench className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No service records</h3>
                <p className="text-slate-500 mb-6">Start tracking your vehicle's maintenance</p>
                <Button onClick={() => setShowAddLog(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Log
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log, index) => (
                  <MaintenanceLogCard 
                    key={log.id} 
                    log={log} 
                    onClick={() => setSelectedLog(log)}
                    index={index}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reminders" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Reminders ({pendingReminders.length} pending)
              </h2>
              <Button onClick={() => setShowAddReminder(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Reminder
              </Button>
            </div>

            {pendingReminders.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No reminders set</h3>
                <p className="text-slate-500 mb-6">Stay on top of your maintenance schedule</p>
                <Button onClick={() => setShowAddReminder(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Reminder
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingReminders.map((reminder) => (
                  <motion.div 
                    key={reminder.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-slate-900">
                          {reminder.custom_title || serviceTypeLabels[reminder.service_type] || reminder.service_type.replace(/_/g, ' ')}
                        </h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          {reminder.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(reminder.due_date), "MMM d, yyyy")}
                            </span>
                          )}
                          {reminder.due_mileage && (
                            <span className="flex items-center gap-1">
                              <Gauge className="w-3 h-3" />
                              {reminder.due_mileage.toLocaleString()} mi
                            </span>
                          )}
                          {reminder.is_recurring && (
                            <Badge variant="secondary" className="text-xs">Recurring</Badge>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => completeReminderMutation.mutate(reminder.id)}
                      >
                        Mark Done
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="mechanics" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Assigned Mechanics ({mechanicAssignments.length})
              </h2>
              <Button 
                onClick={() => setShowAssignMechanic(true)} 
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Assign Mechanic
              </Button>
            </div>

            {mechanicAssignments.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-4">
                  <Wrench className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No mechanics assigned</h3>
                <p className="text-slate-500 mb-6">Assign a mechanic to give them access to service this vehicle</p>
                <Button 
                  onClick={() => setShowAssignMechanic(true)} 
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Assign First Mechanic
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {mechanicAssignments.map((assignment, index) => (
                  <motion.div
                    key={assignment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <Wrench className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{assignment.mechanic_email}</p>
                          {assignment.notes && (
                            <p className="text-sm text-slate-500 mt-1">{assignment.notes}</p>
                          )}
                          {assignment.assigned_date && (
                            <p className="text-xs text-slate-400 mt-2">
                              Assigned {format(new Date(assignment.assigned_date), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeMechanicMutation.mutate(assignment.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Vehicle Information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Make</p>
                  <p className="font-medium">{vehicle.make}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Model</p>
                  <p className="font-medium">{vehicle.model}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Year</p>
                  <p className="font-medium">{vehicle.year}</p>
                </div>
                {vehicle.trim && (
                  <div>
                    <p className="text-sm text-slate-500">Trim</p>
                    <p className="font-medium">{vehicle.trim}</p>
                  </div>
                )}
                {vehicle.vin && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-slate-500">VIN</p>
                    <p className="font-medium font-mono">{vehicle.vin}</p>
                  </div>
                )}
                {vehicle.engine_type && (
                  <div>
                    <p className="text-sm text-slate-500">Engine</p>
                    <p className="font-medium">{vehicle.engine_type}</p>
                  </div>
                )}
                {vehicle.transmission && (
                  <div>
                    <p className="text-sm text-slate-500">Transmission</p>
                    <p className="font-medium capitalize">{vehicle.transmission}</p>
                  </div>
                )}
                {vehicle.color && (
                  <div>
                    <p className="text-sm text-slate-500">Color</p>
                    <p className="font-medium">{vehicle.color}</p>
                  </div>
                )}
                {vehicle.license_plate && (
                  <div>
                    <p className="text-sm text-slate-500">License Plate</p>
                    <p className="font-medium">{vehicle.license_plate}</p>
                  </div>
                )}
                {vehicle.current_mileage && (
                  <div>
                    <p className="text-sm text-slate-500">Current Mileage</p>
                    <p className="font-medium">{vehicle.current_mileage.toLocaleString()} miles</p>
                  </div>
                )}
                {vehicle.purchase_date && (
                  <div>
                    <p className="text-sm text-slate-500">Purchase Date</p>
                    <p className="font-medium">{format(new Date(vehicle.purchase_date), "MMMM d, yyyy")}</p>
                  </div>
                )}
                {vehicle.warranty_expiration && (
                  <div>
                    <p className="text-sm text-slate-500">Warranty Expiration</p>
                    <p className="font-medium">{format(new Date(vehicle.warranty_expiration), "MMMM d, yyyy")}</p>
                    {new Date(vehicle.warranty_expiration) < new Date() && (
                      <p className="text-xs text-red-600 mt-0.5">Expired</p>
                    )}
                  </div>
                )}
                </div>
                </div>
                </TabsContent>
        </Tabs>
      </div>

      <AddLogDialog 
        open={showAddLog}
        onClose={() => setShowAddLog(false)}
        vehicleId={vehicleId}
        currentMileage={vehicle?.current_mileage}
        onSave={(data) => createLogMutation.mutate(data)}
        userTier={user?.subscription_tier}
        vehicleUnit={vehicle?.unit || 'miles'}
      />

      <AddReminderDialog
        open={showAddReminder}
        onClose={() => setShowAddReminder(false)}
        vehicleId={vehicleId}
        onSave={(data) => createReminderMutation.mutate(data)}
        userTier={user?.subscription_tier}
      />

      <TransferDialog
        open={showTransfer}
        onClose={() => {
          setShowTransfer(false);
          setTransferCode(null);
        }}
        vehicle={vehicle}
        transferCode={transferCode}
        onCreateTransfer={(code) => createTransferMutation.mutate(code)}
        userTier={user?.subscription_tier}
      />

      <LogDetailDialog
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
        onDelete={(logId) => deleteLogMutation.mutate(logId)}
      />

      <AssignMechanicDialog
        open={showAssignMechanic}
        onClose={() => setShowAssignMechanic(false)}
        vehicle={vehicle}
        onAssign={(data) => assignMechanicMutation.mutate(data)}
      />

      <UnitConverter
        open={showUnitConverter}
        onClose={() => setShowUnitConverter(false)}
        vehicle={vehicle}
        onConvert={(newUnit) => convertUnitMutation.mutate(newUnit)}
      />
      </div>
      );
      }