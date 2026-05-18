import {
  LayoutDashboard,
  FileText,
  Zap,
  FileEdit,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  User as UserIcon
} from "lucide-react"
import { useLocation, Link, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

export function AppSidebar() {
  const location = useLocation()
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "Resources", icon: FileText, path: "/resources" },
    { label: "PYQ Solver", icon: Zap, path: "/solver" },
    { label: "Paper Gen", icon: FileEdit, path: "/generator" },
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 flex items-center px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-primary size-8 rounded-lg flex items-center justify-center">
            <Zap className="size-5 text-primary-foreground fill-current" />
          </div>
          <span className="font-bold text-xl tracking-tight group-data-[collapsible=icon]:hidden">
            PYQ Solver
          </span>
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu className="px-2 pt-4">
          {navItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === item.path}
                tooltip={item.label}
                className={cn(
                  "h-11 px-4 transition-colors",
                  location.pathname === item.path 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Link to={item.path} className="flex items-center gap-3">
                  <item.icon className="size-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="bg-muted size-8 rounded-full flex items-center justify-center overflow-hidden">
                    <UserIcon className="size-5 text-muted-foreground" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden ml-2">
                    <span className="truncate font-semibold">{user?.email?.split('@')[0]}</span>
                    <span className="truncate text-xs opacity-60 capitalize">{user?.plan} Plan</span>
                  </div>
                  <ChevronRight className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="end"
                className="w-[200px]"
              >
                <DropdownMenuItem onClick={() => setIsDark(!isDark)}>
                  {isDark ? (
                    <><Sun className="mr-2 size-4" /> Light Mode</>
                  ) : (
                    <><Moon className="mr-2 size-4" /> Dark Mode</>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                  onClick={() => {
                    if (window.confirm('Logout?')) {
                      logout();
                      navigate('/login');
                    }
                  }}
                >
                  <LogOut className="mr-2 size-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
