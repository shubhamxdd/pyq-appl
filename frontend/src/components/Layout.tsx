import { AppSidebar } from "./AppSidebar"
import { SidebarInset, SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <header className="flex h-14 md:h-16 shrink-0 items-center gap-2 border-b px-4 md:px-6 sticky top-0 bg-background z-30 transition-all">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
          <div className="flex-1 flex items-center gap-2">
             <span className="font-bold text-sm md:text-base truncate md:hidden">PYQ Solver</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-3 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
