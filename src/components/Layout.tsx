import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Home, Package, ChefHat, Settings, LogOut, Scan, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Pantry', href: '/pantry', icon: Package },
  { name: 'Recipes', href: '/recipes', icon: ChefHat },
  
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show nothing while redirecting to auth
  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-semibold text-foreground">Food Tracker</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="hidden md:flex">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar - Hidden on mobile */}
        <nav className="hidden md:flex w-64 border-r border-border bg-card p-4">
          <div className="flex flex-col gap-2 w-full">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Button
                  key={item.name}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "justify-start w-full",
                    isActive && "bg-secondary text-secondary-foreground"
                  )}
                  onClick={() => navigate(item.href)}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Button>
              );
            })}
            <Button
              variant="default"
              className="mt-4 justify-start w-full"
              onClick={() => navigate('/scan')}
            >
              <Scan className="h-4 w-4 mr-2" />
              Quick Scan
            </Button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Right Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-80 bg-card border-l border-border z-50 transform transition-transform duration-300 ease-in-out md:hidden",
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Menu</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 p-4">
            <div className="flex flex-col gap-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Button
                    key={item.name}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "justify-start w-full h-12",
                      isActive && "bg-secondary text-secondary-foreground"
                    )}
                    onClick={() => {
                      navigate(item.href);
                      setSidebarOpen(false);
                    }}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Button>
                );
              })}
              
              <Button
                variant="default"
                className="mt-4 justify-start w-full h-12"
                onClick={() => {
                  navigate('/scan');
                  setSidebarOpen(false);
                }}
              >
                <Scan className="h-5 w-5 mr-3" />
                Quick Scan
              </Button>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-border">
            <Button 
              variant="ghost" 
              className="w-full justify-start h-12" 
              onClick={() => {
                handleSignOut();
                setSidebarOpen(false);
              }}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}