import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, CheckCircle2, ArrowRight, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const SPECIALTY_OPTIONS = [
  "Oil Changes",
  "Brake Service",
  "Tire Service",
  "Engine Repair",
  "Transmission",
  "Electrical",
  "Diagnostics",
  "Air Conditioning",
  "Suspension",
  "Alignment"
];

export default function MechanicSetup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    shop_name: "",
    shop_address: "",
    shop_phone: "",
    certification: "",
    specialties: []
  });
  const [saving, setSaving] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const setupMechanicMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Mechanic profile created!');
      navigate(createPageUrl('MechanicDashboard'));
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await setupMechanicMutation.mutateAsync({
      is_mechanic: true,
      ...formData
    });
    setSaving(false);
  };

  const toggleSpecialty = (specialty) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  if (user?.is_mechanic) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">You're Already a Mechanic!</h2>
            <p className="text-slate-500 mb-6">Your mechanic profile is set up.</p>
            <Link to={createPageUrl('MechanicDashboard')}>
              <Button className="bg-orange-600 hover:bg-orange-700">
                Go to Mechanic Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-orange-600 flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Become a Mechanic
          </h1>
          <p className="text-slate-500">
            Set up your mechanic profile to start servicing vehicles
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
              <CardDescription>Tell us about your shop and expertise</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label>Shop Name *</Label>
                  <Input
                    placeholder="e.g., QuickFix Auto Repair"
                    value={formData.shop_name}
                    onChange={(e) => setFormData({...formData, shop_name: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Shop Address *</Label>
                  <Input
                    placeholder="123 Main St, City, State"
                    value={formData.shop_address}
                    onChange={(e) => setFormData({...formData, shop_address: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input
                    placeholder="(555) 123-4567"
                    value={formData.shop_phone}
                    onChange={(e) => setFormData({...formData, shop_phone: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Certifications</Label>
                  <Input
                    placeholder="e.g., ASE Certified Master Technician"
                    value={formData.certification}
                    onChange={(e) => setFormData({...formData, certification: e.target.value})}
                  />
                  <p className="text-xs text-slate-500">
                    List your professional certifications
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Specialties</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SPECIALTY_OPTIONS.map((specialty) => (
                      <button
                        key={specialty}
                        type="button"
                        onClick={() => toggleSpecialty(specialty)}
                        className={`p-2 rounded-lg border text-sm transition-all ${
                          formData.specialties.includes(specialty)
                            ? 'bg-orange-50 border-orange-300 text-orange-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{specialty}</span>
                          {formData.specialties.includes(specialty) && (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Select your areas of expertise
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">What you'll be able to do:</p>
                      <ul className="space-y-0.5 text-xs">
                        <li>• View assigned vehicles and their service history</li>
                        <li>• Log maintenance and attach receipts/photos</li>
                        <li>• Track all services you've performed</li>
                        <li>• Communicate with vehicle owners</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Link to={createPageUrl('Dashboard')} className="flex-1">
                    <Button type="button" variant="outline" className="w-full">
                      Cancel
                    </Button>
                  </Link>
                  <Button 
                    type="submit" 
                    disabled={saving || !formData.shop_name || !formData.shop_address || !formData.shop_phone}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        Complete Setup
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}