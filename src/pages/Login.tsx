import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Sprout, Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginInput = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    try {
      const res = await api.post('/auth/login', values);
      setSession({
        user: res.data.user,
        accessToken: res.data.access_token,
        refreshToken: res.data.refresh_token,
      });
      toast.success('Welcome back!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-12 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur border border-white/30">
              <Sprout className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold">AgroShop</span>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Simplify your shop operations
          </h2>
          <p className="text-emerald-50/95 max-w-md text-lg leading-relaxed">
            Manage inventory, customers, GST billing, and detailed reports all in one powerful platform. 
            Built specifically for Indian agricultural retailers.
          </p>
          
          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 mt-0.5">
                <span className="text-sm font-bold">✓</span>
              </div>
              <div>
                <p className="font-semibold">Easy Inventory Management</p>
                <p className="text-sm text-emerald-50/80">Track stock levels and expiry dates</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 mt-0.5">
                <span className="text-sm font-bold">✓</span>
              </div>
              <div>
                <p className="font-semibold">GST Compliant Billing</p>
                <p className="text-sm text-emerald-50/80">Generate invoices with automatic GST</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 mt-0.5">
                <span className="text-sm font-bold">✓</span>
              </div>
              <div>
                <p className="font-semibold">Smart Reports</p>
                <p className="text-sm text-emerald-50/80">Real-time sales and profit insights</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-emerald-100/70">© {new Date().getFullYear()} AgroShop Manager</div>
      </div>

      {/* Right Panel */}
      <div className="flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-white via-slate-50 to-blue-50 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-100/15 rounded-full blur-3xl -ml-36 -mb-36" />
        
        <div className="w-full max-w-md relative z-10">
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg">
              <Sprout className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold text-slate-900">AgroShop</span>
          </div>

          <div className="mb-12">
            <h1 className="text-4xl font-bold text-slate-900 leading-tight">Welcome</h1>
            <p className="mt-3 text-slate-600 text-lg">Sign in to manage your shop</p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-2xl">
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-3">
                <Label htmlFor="email" className="text-slate-700 font-semibold text-sm">Email Address</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@shop.com"
                    className="pl-12 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all text-slate-900"
                    {...form.register('email')}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-xs text-red-500 font-medium mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="text-slate-700 font-semibold text-sm">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pl-12 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all text-slate-900"
                    {...form.register('password')}
                  />
                </div>
                {form.formState.errors.password && (
                  <p className="text-xs text-red-500 font-medium mt-1">{form.formState.errors.password.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold mt-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95" 
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Footer text */}
          <p className="text-center text-sm text-slate-500 mt-8">
            Manage your shop with ease and confidence
          </p>
        </div>
      </div>
    </div>
  );
}
