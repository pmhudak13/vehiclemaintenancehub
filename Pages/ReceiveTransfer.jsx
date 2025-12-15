import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Car, CheckCircle2, XCircle, Loader2, AlertTriangle, 
  Gauge, Calendar, ArrowRight 
} from "lucide-react";
import { motion } from "framer-motion";

export default function ReceiveTransfer() {
  const urlParams = new URLSearchParams(window.location.search);
  const transferCode = urlParams.get('code');
  
  const [status, setStatus] = useState('loading'); // loading, found, accepting, success, error, expired, not_found

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: activeVehicles = [] } = useQuery({
    queryKey: ['userVehicles'],
    queryFn: () => base44.entities.Vehicle.filter({ is_active: true }),
    enabled: !!user,
  });

  const { data: transfer, isLoading: loadingTransfer } = useQuery({
    queryKey: ['transfer', transferCode],
    queryFn: async () => {
      const transfers = await base44.entities.Transfer.filter({ transfer_code: transferCode });
      return transfers[0];
    },
    enabled: !!transferCode,
  });

  const { data: vehicle } = useQuery({
    queryKey: ['transferVehicle', transfer?.vehicle_id],
    queryFn: async () => {
      const vehicles = await base44.entities.Vehicle.filter({ id: transfer.vehicle_id });
      return vehicles[0];
    },
    enabled: !!transfer?.vehicle_id,
  });

  useEffect(() => {
    if (!loadingTransfer) {
      if (!transfer) {
        setStatus('not_found');
      } else if (transfer.status === 'completed') {
        setStatus('already_completed');
      } else if (transfer.status === 'expired' || (transfer.expires_at && new Date(transfer.expires_at) < new Date())) {
        setStatus('expired');
      } else if (transfer.status === 'cancelled') {
        setStatus('cancelled');
      } else {
        setStatus('found');
      }
    }
  }, [transfer, loadingTransfer]);

  const acceptTransferMutation = useMutation({
    mutationFn: async () => {
      // Free tier: can only receive if they have 0 vehicles
      if (user?.subscription_tier === 'free' && activeVehicles.length > 0) {
        throw new Error('Free tier users can only receive a vehicle if they have 0 vehicles. Please upgrade or delete your existing vehicle.');
      }
      
      // Update vehicle owner
      const ownershipHistory = vehicle?.ownership_history || [];
      ownershipHistory.push({
        owner_email: transfer.from_user_email,
        from_date: vehicle?.created_date,
        to_date: new Date().toISOString()
      });

      await base44.entities.Vehicle.update(transfer.vehicle_id, {
        created_by: user.email,
        ownership_history: ownershipHistory
      });

      // Mark transfer as completed
      await base44.entities.Transfer.update(transfer.id, {
        status: 'completed',
        to_user_email: user.email,
        completed_at: new Date().toISOString()
      });

      setStatus('success');
    },
    onError: () => {
      setStatus('error');
    },
  });

  const subscriptionTier = user?.subscription_tier || 'free';
  const canReceive = subscriptionTier === 'paid' || activeVehicles.length === 0;

  if (!transferCode) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Transfer Link</h2>
            <p className="text-slate-500 mb-4">No transfer code provided.</p>
            <Link to={createPageUrl('Dashboard')}>
              <Button>Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        {status === 'loading' && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
              <p className="text-slate-600">Loading transfer details...</p>
            </CardContent>
          </Card>
        )}

        {status === 'not_found' && (
          <Card>
            <CardContent className="pt-6 text-center">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Transfer Not Found</h2>
              <p className="text-slate-500 mb-4">This transfer link is invalid or has been removed.</p>
              <Link to={createPageUrl('Dashboard')}>
                <Button>Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {status === 'expired' && (
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Transfer Expired</h2>
              <p className="text-slate-500 mb-4">This transfer link has expired. Please ask the owner to generate a new one.</p>
              <Link to={createPageUrl('Dashboard')}>
                <Button>Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {status === 'cancelled' && (
          <Card>
            <CardContent className="pt-6 text-center">
              <XCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Transfer Cancelled</h2>
              <p className="text-slate-500 mb-4">This transfer has been cancelled by the owner.</p>
              <Link to={createPageUrl('Dashboard')}>
                <Button>Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {status === 'already_completed' && (
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Transfer Already Completed</h2>
              <p className="text-slate-500 mb-4">This vehicle has already been transferred.</p>
              <Link to={createPageUrl('Dashboard')}>
                <Button>Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {status === 'found' && vehicle && (
          <Card className="overflow-hidden">
            <div className="h-40 bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <Car className="w-16 h-16 text-white/30" />
            </div>
            <CardHeader>
              <CardTitle>Vehicle Transfer</CardTitle>
              <CardDescription>
                {transfer.from_user_email} wants to transfer this vehicle to you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-lg">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                {vehicle.trim && <p className="text-slate-500">{vehicle.trim}</p>}
                <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
                  {vehicle.current_mileage && (
                    <span className="flex items-center gap-1">
                      <Gauge className="w-4 h-4" />
                      {vehicle.current_mileage.toLocaleString()} mi
                    </span>
                  )}
                  {vehicle.vin && (
                    <span className="font-mono text-xs bg-slate-200 px-2 py-1 rounded">
                      VIN: ...{vehicle.vin.slice(-6)}
                    </span>
                  )}
                </div>
              </div>

              {!canReceive && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Cannot Receive Transfer</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Free accounts can only receive a vehicle if they have 0 vehicles. Please upgrade to Premium or delete your existing vehicle first.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                onClick={() => {
                  setStatus('accepting');
                  acceptTransferMutation.mutate();
                }}
                disabled={!canReceive || status === 'accepting'}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {status === 'accepting' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Accepting Transfer...
                  </>
                ) : (
                  <>
                    Accept Transfer
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {status === 'success' && (
          <Card>
            <CardContent className="pt-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
              >
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              </motion.div>
              <h2 className="text-xl font-semibold mb-2">Transfer Complete!</h2>
              <p className="text-slate-500 mb-6">
                The {vehicle?.year} {vehicle?.make} {vehicle?.model} is now yours.
              </p>
              <Link to={createPageUrl(`VehicleDetail?id=${vehicle?.id}`)}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  View Your Vehicle
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {status === 'error' && (
          <Card>
            <CardContent className="pt-6 text-center">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Transfer Failed</h2>
              <p className="text-slate-500 mb-4">Something went wrong. Please try again.</p>
              <Button onClick={() => setStatus('found')}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}