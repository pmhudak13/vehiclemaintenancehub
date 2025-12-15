import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Crown, Check, X, ArrowLeft, Car, Wrench, 
  Bell, FileText, Sparkles, Send 
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { name: "Add Vehicles", free: "1 vehicle", paid: "Unlimited", icon: Car },
  { name: "Maintenance Logs", free: "Unlimited", paid: "Unlimited", icon: Wrench },
  { name: "Attachments", free: "Unlimited", paid: "Unlimited", icon: FileText },
  { name: "Basic Reminders", free: true, paid: true, icon: Bell },
  { name: "Advanced Reminders", free: false, paid: true, icon: Bell },
  { name: "Vehicle Transfer", free: "1 vehicle", paid: "Unlimited", icon: Send },
  { name: "Export History (PDF)", free: false, paid: true, icon: FileText },
  { name: "Predictive Maintenance", free: false, paid: true, icon: Sparkles },
  { name: "Priority Support", free: false, paid: true, icon: Crown },
];

export default function Subscription() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isPaid = user?.subscription_tier === 'paid';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Choose Your Plan</h1>
            <p className="text-slate-500 mt-1">Select the plan that works best for you</p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className={`h-full ${!isPaid ? 'ring-2 ring-blue-600' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Free</CardTitle>
                  {!isPaid && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      Current Plan
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-slate-500">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-6">
                  Perfect for tracking a single vehicle
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>1 vehicle</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>Unlimited maintenance logs</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>Photo & PDF attachments</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>Basic reminders</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>Vehicle transfer (1 vehicle)</span>
                  </li>
                  <li className="flex items-center gap-3 text-slate-400">
                    <X className="w-5 h-5" />
                    <span>Advanced reminders</span>
                  </li>
                  <li className="flex items-center gap-3 text-slate-400">
                    <X className="w-5 h-5" />
                    <span>Export history (PDF)</span>
                  </li>
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full mt-6"
                  disabled={!isPaid}
                >
                  {!isPaid ? 'Current Plan' : 'Downgrade'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Premium Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className={`h-full relative overflow-hidden ${isPaid ? 'ring-2 ring-blue-600' : ''}`}>
              <div className="absolute top-0 right-0 bg-gradient-to-l from-blue-600 to-blue-500 text-white px-4 py-1 text-sm font-medium rounded-bl-xl">
                Most Popular
              </div>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500" />
                    Premium
                  </CardTitle>
                  {isPaid && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      Current Plan
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$9.99</span>
                  <span className="text-slate-500">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-6">
                  For serious car enthusiasts & families
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Unlimited vehicles</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>Unlimited maintenance logs</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>Photo & PDF attachments</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Advanced reminders</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Unlimited transfers</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Export history (PDF)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Predictive maintenance</span>
                  </li>
                </ul>
                <Button 
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
                  disabled={isPaid}
                >
                  {isPaid ? 'Current Plan' : 'Upgrade Now'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Feature Comparison */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Feature Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Feature</th>
                      <th className="text-center py-3 px-4 font-medium">Free</th>
                      <th className="text-center py-3 px-4 font-medium">
                        <span className="flex items-center justify-center gap-1">
                          <Crown className="w-4 h-4 text-amber-500" />
                          Premium
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {features.map((feature, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <feature.icon className="w-4 h-4 text-slate-400" />
                            {feature.name}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {typeof feature.free === 'boolean' ? (
                            feature.free ? (
                              <Check className="w-5 h-5 text-green-600 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-slate-300 mx-auto" />
                            )
                          ) : (
                            <span className="text-slate-600">{feature.free}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {typeof feature.paid === 'boolean' ? (
                            feature.paid ? (
                              <Check className="w-5 h-5 text-green-600 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-slate-300 mx-auto" />
                            )
                          ) : (
                            <span className="text-slate-600 font-medium">{feature.paid}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* FAQ or Support */}
        <div className="text-center mt-12 text-slate-500">
          <p>Have questions about our plans?</p>
          <Button variant="link" className="text-blue-600">
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}