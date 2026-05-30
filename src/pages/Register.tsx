import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Sprout, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

const step1Schema = z
  .object({
    name: z.string().min(2, 'Name is too short'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Min 8 characters'),
    confirm_password: z.string().min(8),
  })
  .refine((v) => v.password === v.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

const step2Schema = z.object({
  shop_name: z.string().min(2, 'Shop name is required'),
  shop_phone: z.string().min(7, 'Phone is required'),
  shop_address: z.string().min(5, 'Address is required'),
});

type Step1Input = z.infer<typeof step1Schema>;
type Step2Input = z.infer<typeof step2Schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [step1Data, setStep1Data] = useState<Step1Input | null>(null);

  const step1 = useForm<Step1Input>({
    resolver: zodResolver(step1Schema),
    defaultValues: { name: '', email: '', password: '', confirm_password: '' },
  });

  const step2 = useForm<Step2Input>({
    resolver: zodResolver(step2Schema),
    defaultValues: { shop_name: '', shop_phone: '', shop_address: '' },
  });

  function onStep1(values: Step1Input) {
    setStep1Data(values);
    setStep(2);
  }

  async function onStep2(values: Step2Input) {
    if (!step1Data) return;
    setSubmitting(true);
    try {
      const res = await api.post('/auth/register', {
        name: step1Data.name,
        email: step1Data.email,
        password: step1Data.password,
        shop_name: values.shop_name,
        shop_phone: values.shop_phone,
        shop_address: values.shop_address,
      });
      setSession({
        user: res.data.user,
        accessToken: res.data.access_token,
        refreshToken: res.data.refresh_token,
        permissions: res.data.permissions ?? null,
        shops: res.data.shops ?? [],
        currentShopId: res.data.current_shop_id ?? null,
      });
      toast.success('Account created!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-emerald-600 p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
            <Sprout className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold">AgroShop Manager</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-tight">
            Get your shop running in minutes.
          </h2>
          <p className="mt-4 text-emerald-50/90 max-w-md">
            Set up your profile, add products, start billing. Free to try.
          </p>
        </div>
        <div className="text-sm text-emerald-100/80">© {new Date().getFullYear()} AgroShop Manager</div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Sprout className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">AgroShop</span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <div
              className={`h-2 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-emerald-600' : 'bg-slate-200'}`}
            />
            <div
              className={`h-2 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-emerald-600' : 'bg-slate-200'}`}
            />
          </div>
          <p className="text-xs text-slate-500 mb-6">Step {step} of 2</p>

          <h1 className="text-2xl font-bold text-slate-900">
            {step === 1 ? 'Create your account' : 'Your shop details'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {step === 1 ? 'Personal information first.' : 'Tell us about your shop.'}
          </p>

          {step === 1 && (
            <form className="mt-8 space-y-4" onSubmit={step1.handleSubmit(onStep1)}>
              <Field
                label="Full name"
                id="name"
                error={step1.formState.errors.name?.message}
                input={<Input id="name" autoComplete="name" {...step1.register('name')} />}
              />
              <Field
                label="Email"
                id="email"
                error={step1.formState.errors.email?.message}
                input={<Input id="email" type="email" autoComplete="email" {...step1.register('email')} />}
              />
              <Field
                label="Password"
                id="password"
                error={step1.formState.errors.password?.message}
                input={<Input id="password" type="password" autoComplete="new-password" {...step1.register('password')} />}
              />
              <Field
                label="Confirm password"
                id="confirm_password"
                error={step1.formState.errors.confirm_password?.message}
                input={<Input id="confirm_password" type="password" autoComplete="new-password" {...step1.register('confirm_password')} />}
              />
              <Button type="submit" className="w-full" size="lg">
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}

          {step === 2 && (
            <form className="mt-8 space-y-4" onSubmit={step2.handleSubmit(onStep2)}>
              <Field
                label="Shop name"
                id="shop_name"
                error={step2.formState.errors.shop_name?.message}
                input={<Input id="shop_name" {...step2.register('shop_name')} />}
              />
              <Field
                label="Shop phone"
                id="shop_phone"
                error={step2.formState.errors.shop_phone?.message}
                input={<Input id="shop_phone" {...step2.register('shop_phone')} />}
              />
              <div className="space-y-1.5">
                <Label htmlFor="shop_address">Shop address</Label>
                <Textarea id="shop_address" rows={3} {...step2.register('shop_address')} />
                {step2.formState.errors.shop_address && (
                  <p className="text-xs text-red-500">{step2.formState.errors.shop_address.message}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                  size="lg"
                  disabled={submitting}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button type="submit" className="flex-1" size="lg" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create account
                </Button>
              </div>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-emerald-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  input,
  error,
}: {
  id: string;
  label: string;
  input: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {input}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
