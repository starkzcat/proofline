import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput, Role } from '@proofline/shared';
import { useAuth } from '../context/AuthContext.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.js';
import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';

const DEMO_ACCOUNTS = [
  { role: Role.ADMIN, label: 'Admin', email: 'admin@proofline.dev' },
  { role: Role.MARKETER, label: 'Marketer', email: 'marketer@proofline.dev' },
  { role: Role.CLIENT, label: 'Client', email: 'client@proofline.dev' },
];

export function LoginPage() {
  const { login, demoSwitch } = useAuth();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setAuthError(null);
      setIsSubmitting(true);
      await login(data.email, data.password);
      navigate('/campaigns');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password';
      setAuthError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (role: Role) => {
    try {
      setAuthError(null);
      setIsSubmitting(true);
      await demoSwitch(role);
      navigate('/campaigns');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to switch demo account';
      setAuthError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="h-6 w-6 rounded bg-zinc-900 flex items-center justify-center text-white text-xs font-bold font-mono">
            P
          </span>
          <span className="font-semibold text-base tracking-tight text-slate-900">
            Proofline
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>
              Enter your credentials or choose a 1-click demo role below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {authError && (
              <div
                role="alert"
                className="p-2.5 rounded-md border border-rose-200 bg-rose-50 text-rose-700 text-xs"
              >
                {authError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700" htmlFor="email">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@proofline.dev"
                  autoComplete="email"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-[11px] text-rose-600">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700" htmlFor="password">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-[11px] text-rose-600">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-2 text-slate-400 font-mono">
                  Or instant demo access
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map(({ role, label }) => (
                <Button
                  key={role}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => handleDemoLogin(role)}
                  className="w-full text-xs"
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
