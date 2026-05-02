import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Store, Mail, Lock, User, Phone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Auth() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      toast.error(t('auth.signIn') + ' - ' + t('common.error'), {
        description: error.message === 'Invalid login credentials' 
          ? t('auth.email') + ' / ' + t('auth.password')
          : error.message
      });
    } else {
      toast.success(t('auth.loginSuccess'));
      navigate('/');
    }
    
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupName.trim()) {
      toast.error(t('auth.displayName'));
      return;
    }
    
    if (signupPassword.length < 6) {
      toast.error(t('auth.password') + ' (min 6)');
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(signupEmail, signupPassword, signupName, signupPhone);
    
    if (error) {
      toast.error(t('auth.signUp') + ' - ' + t('common.error'), {
        description: error.message
      });
    } else {
      toast.success(t('auth.signupSuccess'), {
        description: t('auth.signIn')
      });
      navigate('/');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-success/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <Store className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">{t('header.appName')}</CardTitle>
            <CardDescription>{t('header.appNameSecondary')}</CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">{t('auth.signIn')}</TabsTrigger>
              <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
            </TabsList>
            
            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="example@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pr-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pr-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      {t('auth.loggingIn')}
                    </>
                  ) : (
                    t('auth.signIn')
                  )}
                </Button>
              </form>
            </TabsContent>
            
            {/* Signup Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{t('auth.displayName')} *</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="هاني"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className="pr-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">{t('common.phone')}</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="+216 22 123 456"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                      className="pr-10"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('auth.email')} *</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="example@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="pr-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('auth.password')} *</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="6 أحرف على الأقل"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pr-10"
                      required
                      minLength={6}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      {t('auth.creatingAccount')}
                    </>
                  ) : (
                    t('auth.signUp')
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
