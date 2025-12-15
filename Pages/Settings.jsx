import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, Bell, Shield, Crown, Save, Loader2, CheckCircle2 
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Settings() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const [preferences, setPreferences] = useState({
    email_reminders: user?.notification_preferences?.email_reminders ?? true,
    push_reminders: user?.notification_preferences?.push_reminders ?? true,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe({ notification_preferences: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setSaved(true);
      toast.success('Settings saved');
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSavePreferences = async () => {
    setSaving(true);
    await updatePreferencesMutation.mutateAsync(preferences);
    setSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Manage your account and preferences</p>
        </motion.div>

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              <span className="hidden sm:inline">Subscription</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your personal account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={user?.full_name || ''} disabled className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ''} disabled className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>Member Since</Label>
                  <Input 
                    value={user?.created_date ? new Date(user.created_date).toLocaleDateString() : ''} 
                    disabled 
                    className="bg-slate-50" 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Reminders</p>
                    <p className="text-sm text-slate-500">Receive maintenance reminders via email</p>
                  </div>
                  <Switch
                    checked={preferences.email_reminders}
                    onCheckedChange={(checked) => setPreferences({...preferences, email_reminders: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-slate-500">Receive push notifications on your device</p>
                  </div>
                  <Switch
                    checked={preferences.push_reminders}
                    onCheckedChange={(checked) => setPreferences({...preferences, push_reminders: checked})}
                  />
                </div>
                
                <Button 
                  onClick={handleSavePreferences} 
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : saved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  Subscription
                </CardTitle>
                <CardDescription>Manage your subscription plan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-lg">
                        {user?.subscription_tier === 'paid' ? 'Premium Plan' : 'Free Plan'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {user?.subscription_tier === 'paid' 
                          ? 'Unlimited vehicles and all features'
                          : 'Limited to 1 vehicle'
                        }
                      </p>
                    </div>
                    {user?.subscription_tier === 'paid' ? (
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                        Active
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-200 text-slate-600 rounded-full text-sm font-medium">
                        Free
                      </span>
                    )}
                  </div>
                </div>

                {user?.subscription_tier !== 'paid' && (
                  <div className="border border-blue-200 rounded-xl p-6 bg-blue-50/50">
                    <h3 className="font-semibold text-lg mb-4">Upgrade to Premium</h3>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        Unlimited vehicles
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        Unlimited transfers
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        Export service history (PDF)
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        Advanced reminders
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        Predictive maintenance
                      </li>
                    </ul>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Upgrade for $9.99/month
                    </Button>
                  </div>
                )}

                {user?.subscription_tier === 'paid' && (
                  <div className="text-center text-sm text-slate-500">
                    <p>Need to manage your subscription?</p>
                    <Button variant="link" className="text-blue-600">
                      Manage Billing
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}