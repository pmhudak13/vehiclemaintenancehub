import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Plus, Car, Gauge, Settings, 
  Wrench, AlertTriangle, FileText
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

import MaintenanceLogCard from "../components/vehicle/MaintenanceLogCard";
import AddLogDialog from "../components/vehicle/AddLogDialog";
import LogDetailDialog from "../components/vehicle/LogDetailDialog";
import InvoiceGenerator from "../components/mechanic/InvoiceGenerator";

export default function MechanicVehicleDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const vehicleId = urlParams.get('id');
  
  const [showAddLog, setShowAddLog] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: assignment } = useQuery({
    queryKey: ['mechanicAssignment', vehicleId],
    queryFn: async () => {
      const assignments = await base44.entities.MechanicAssignment.filter({ 
        vehicle_id: vehicleId,
        mechanic_id: user?.id,
        status: 'active'
      });
      return assignments[0];
    },
    enabled: !!vehicleId && !!user?.id,
  });

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['mechanicVehicle', vehicleId],
    queryFn: async () => {
      const vehicles = await base44.entities.Vehicle.filter({ id: vehicleId });
      return vehicles[0];
    },
    enabled: !!vehicleId && !!assignment,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['mechanicVehicleLogs', vehicleId],
    queryFn: () => base44.entities.MaintenanceLog.filter({ vehicle_id: vehicleId }, '-date'),
    enabled: !!vehicleId && !!assignment,
  });

  const createLogMutation = useMutation({
    mutationFn: async (data) => {
      const logData = {
        ...data,
        mechanic_id: user.id
      };
      await base44.entities.MaintenanceLog.create(logData);
      
      // Update vehicle mileage if higher
      if (data.mileage && vehicle && data.mileage > (vehicle.current_mileage || 0)) {
        await base44.entities.Vehicle.update(vehicleId, { current_mileage: data.mileage });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mechanicVehicleLogs', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['mechanicVehicle', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['mechanicLogs'] });
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: (logId) => base44.entities.MaintenanceLog.delete(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mechanicVehicleLogs', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['mechanicLogs'] });
      setSelectedLog(null);
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData) => {
      const invoice = await base44.entities.Invoice.create(invoiceData);
      return invoice;
    },
    onSuccess: () => {
      setShowInvoiceGenerator(false);
    },
  });

  const defaultImage = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=400&fit=crop";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-6">
            This vehicle is not assigned to you. Only assigned mechanics can view vehicle details.
          </p>
          <Link to={createPageUrl('MechanicDashboard')}>
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Car className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Vehicle not found</p>
          <Link to={createPageUrl('MechanicDashboard')}>
            <Button variant="link" className="mt-4">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const myLogs = logs.filter(log => log.mechanic_id === user?.id);

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
        
        <div className="absolute top-4 left-4">
          <Link to={createPageUrl('MechanicDashboard')}>
            <Button variant="ghost" size="icon" className="bg-white/10 backdrop-blur-sm text-white hover:bg-white/20">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
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
              <Badge className="bg-orange-600/90 backdrop-blur-sm text-white border-0">
                Mechanic View
              </Badge>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Owner Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-900">
            <strong>Vehicle Owner:</strong> {assignment.owner_email}
          </p>
          {assignment.notes && (
            <p className="text-sm text-blue-800 mt-1">
              <strong>Notes:</strong> {assignment.notes}
            </p>
          )}
        </div>

        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">Service History</span>
              <span className="sm:hidden">History</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  All Services ({logs.length})
                </h2>
                <p className="text-sm text-slate-500">
                  You've logged {myLogs.length} service{myLogs.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowInvoiceGenerator(true)}
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Generate Invoice</span>
                  <span className="sm:hidden">Invoice</span>
                </Button>
                <Button 
                  onClick={() => setShowAddLog(true)} 
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Log Service</span>
                  <span className="sm:hidden">Log</span>
                </Button>
              </div>
            </div>

            {logs.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-4">
                  <Wrench className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No service records</h3>
                <p className="text-slate-500 mb-6">Be the first to log a service for this vehicle</p>
                <Button 
                  onClick={() => setShowAddLog(true)} 
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Log First Service
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log, index) => (
                  <div key={log.id} className="relative">
                    <MaintenanceLogCard 
                      log={log} 
                      onClick={() => setSelectedLog(log)}
                      index={index}
                    />
                    {log.mechanic_id === user?.id && (
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-orange-100 text-orange-700 text-xs">
                          You logged this
                        </Badge>
                      </div>
                    )}
                  </div>
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
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Privacy Notice</p>
                  <p>
                    You can only view vehicle details and service history. 
                    Owner personal information is not accessible.
                  </p>
                </div>
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
      />

      <LogDetailDialog
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
        onDelete={(logId) => {
          // Only allow deleting own logs
          if (selectedLog?.mechanic_id === user?.id) {
            deleteLogMutation.mutate(logId);
          }
        }}
      />

      <InvoiceGenerator
        open={showInvoiceGenerator}
        onClose={() => setShowInvoiceGenerator(false)}
        vehicle={{
          ...vehicle,
          owner_email: assignment?.owner_email,
          owner_name: assignment?.owner_email?.split('@')[0]
        }}
        mechanic={user}
        maintenanceLog={logs[0]}
        onSave={(data) => createInvoiceMutation.mutate(data)}
      />
    </div>
  );
}