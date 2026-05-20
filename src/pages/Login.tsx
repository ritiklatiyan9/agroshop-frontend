import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import logo from '@/assets/logo.png';
import { savePendingFcmToken } from '@/lib/fcm';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginInput = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        permissions: res.data.permissions ?? null,
      });
      savePendingFcmToken();
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
    /*
     * Outer wrapper: fixed background via ::before so the green gradient always
     * fills the screen. The content div uses normal document flow with no
     * viewport-unit heights so Android's adjustPan can pan it freely when the
     * keyboard opens — zero layout reflow, zero input blur.
     */
    <div style={{ background: 'linear-gradient(160deg,#064e3b 0%,#065f46 40%,#047857 100%)', minHeight: '100vh' }}>

      {/* Branding */}
      <div className="flex flex-col items-center justify-center px-6 pt-16 pb-10">
        <div
          className="flex items-center justify-center w-24 h-24 rounded-3xl bg-white mb-5"
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.28)' }}
        >
          <img src={logo} alt="Cropland" className="w-16 h-16 object-contain" />
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Cropland</h1>
        <p className="mt-1.5 text-emerald-200 text-sm font-medium tracking-wide">
          Agri Shop Management
        </p>
      </div>

      {/* Form card */}
      <div
        className="bg-white px-6 pt-8 pb-16"
        style={{ borderRadius: '32px 32px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}
      >
        <div className="max-w-sm mx-auto">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
            <p className="text-slate-500 text-sm mt-1">Enter your credentials to continue</p>
          </div>

          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                style={{ height: 52, fontSize: 16, borderRadius: 12 }}
                className="border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-red-500 font-medium">{form.formState.errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={{ height: 52, fontSize: 16, borderRadius: 12, paddingRight: 48 }}
                  className="border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                  {...form.register('password')}
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-red-500 font-medium">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full text-white font-bold rounded-xl active:scale-95 transition-transform"
                style={{
                  height: 52,
                  fontSize: 16,
                  background: submitting ? '#9ca3af' : 'linear-gradient(135deg,#059669 0%,#047857 100%)',
                  boxShadow: submitting ? 'none' : '0 8px 24px rgba(5,150,105,0.4)',
                }}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>
            </div>
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">
            © {new Date().getFullYear()} Cropland · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
