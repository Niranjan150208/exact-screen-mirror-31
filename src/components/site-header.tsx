import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Radar,
  Shield,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { notificationsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/browse", label: "Browse" },
  { to: "/report/lost", label: "Report lost" },
  { to: "/report/found", label: "Report found" },
  { to: "/impact", label: "Impact" },
] as const;

export function SiteHeader() {
  const { user, isAdmin, displayName } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: notifications = [] } = useQuery(notificationsQuery(user?.id));
  const unread = notifications.filter((n) => !n.read).length;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  async function markAllRead() {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="gradient-brand flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground shadow-soft">
            <Radar className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">FindBack</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                pathname === link.to && "bg-secondary text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                  {unread > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {unread}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <p className="text-sm font-semibold">Notifications</p>
                  {unread > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 && (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No notifications yet.
                    </p>
                  )}
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn("border-b px-4 py-3 last:border-0", !n.read && "bg-primary/5")}
                    >
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-2">
                  <UserIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{displayName || "Account"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">
                      <Shield className="mr-2 h-4 w-4" /> Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" variant="hero" className="hidden sm:inline-flex">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <nav className="mt-10 flex flex-col gap-1">
                {NAV.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-secondary"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link to="/dashboard" className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-secondary">
                  Dashboard
                </Link>
                {!user && (
                  <Link to="/auth" className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-secondary">
                    Sign in
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/", label: "Home", icon: Radar },
    { to: "/browse", label: "Browse", icon: Compass },
    { to: "/report/lost", label: "Report", icon: Plus },
    { to: "/dashboard", label: "Me", icon: LayoutDashboard },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground",
              pathname === item.to && "text-primary",
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
