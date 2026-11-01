import * as React from "react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

const SidebarContext = React.createContext({
  isSidebarOpen: true,
  setSidebarOpen: () => {},
})

function SidebarProvider({ children, defaultOpen = true }) {
  const isMobile = useIsMobile()
  const [isSidebarOpen, setSidebarOpen] = React.useState(
    isMobile ? false : defaultOpen
  )

  return (
    <SidebarContext.Provider value={{ isSidebarOpen, setSidebarOpen }}>
      {children}
    </SidebarContext.Provider>
  )
}

function useSidebar() {
  const context = React.useContext(SidebarContext)

  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }

  return context
}

function Sidebar({ className, children, ...props }) {
  const { isSidebarOpen } = useSidebar()

  return (
    <aside
      data-state={isSidebarOpen ? "open" : "closed"}
      className={cn(
        "fixed left-0 top-0 z-50 flex h-full w-full flex-col border-r bg-sidebar border-sidebar-border md:sticky md:h-screen md:w-56 md:shadow-none md:transition-[width] md:duration-200 md:data-[state=closed]:w-14 lg:w-64",
        className
      )}
      {...props}
    >
      {children}
    </aside>
  )
}

function SidebarHeader({ className, children, ...props }) {
  const { isSidebarOpen } = useSidebar()

  return (
    <header
      data-state={isSidebarOpen ? "open" : "closed"}
      className={cn(
        "flex h-14 w-full shrink-0 items-center overflow-hidden border-b border-sidebar-border px-4",
        className
      )}
      {...props}
    >
      {children}
    </header>
  )
}

function SidebarContent({ className, children, ...props }) {
  return (
    <nav
      className={cn("flex-1 overflow-auto overscroll-contain", className)}
      {...props}
    >
      {children}
    </nav>
  )
}

function SidebarFooter({ className, children, ...props }) {
  const { isSidebarOpen } = useSidebar()

  return (
    <footer
      data-state={isSidebarOpen ? "open" : "closed"}
      className={cn(
        "flex shrink-0 items-center border-t border-sidebar-border p-4 md:data-[state=closed]:justify-center md:data-[state=closed]:p-2",
        className
      )}
      {...props}
    >
      {children}
    </footer>
  )
}

function SidebarGroup({ className, children, ...props }) {
  return (
    <div className={cn("px-2 py-4 md:px-0 md:px-0 md:py-2", className)} {...props}>
      {children}
    </div>
  )
}

function SidebarGroupLabel({ className, children, ...props }) {
  const { isSidebarOpen } = useSidebar()

  return (
    <h3
      data-state={isSidebarOpen ? "open" : "closed"}
      className={cn(
        "mb-2 px-4 text-xs font-medium uppercase tracking-tight text-sidebar-foreground/80 md:data-[state=closed]:sr-only",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
}

function SidebarGroupContent({ className, children, ...props }) {
  return (
    <div className={cn("space-y-1", className)} {...props}>
      {children}
    </div>
  )
}

function SidebarMenu({ className, children, ...props }) {
  return (
    <ul className={cn("space-y-1", className)} {...props}>
      {children}
    </ul>
  )
}

function SidebarMenuItem({ className, children, ...props }) {
  return (
    <li className={cn("", className)} {...props}>
      {children}
    </li>
  )
}

function SidebarMenuButton({ asChild, className, children, ...props }) {
  const { isSidebarOpen } = useSidebar()
  const Comp = asChild ? React.Fragment : "button"
  const buttonClassName = cn(
    "relative inline-flex h-full w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground ring-offset-sidebar hover:bg-sidebar-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[[data-state=closed]]:justify-center group-[[data-state=closed]]:px-0 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0",
    className
  )

  return (
    <div
      data-state={isSidebarOpen ? "open" : "closed"}
      className={cn(
        "group relative flex h-9 w-full items-center",
        asChild ? "data-[state=closed]:h-9 data-[state=closed]:w-9" : ""
      )}
    >
      {asChild ? (
        <Comp>
          {React.cloneElement(children, {
            className: cn(buttonClassName, children.props.className),
            ...props
          })}
        </Comp>
      ) : (
        <button
          data-state={isSidebarOpen ? "open" : "closed"}
          className={buttonClassName}
          {...props}
        >
          {children}
        </button>
      )}
    </div>
  )
}

function SidebarTrigger({ className, ...props }) {
  const { isSidebarOpen, setSidebarOpen } = useSidebar()

  return (
    <button
      type="button"
      onClick={() => setSidebarOpen(!isSidebarOpen)}
      data-state={isSidebarOpen ? "open" : "closed"}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md border border-input bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:hidden",
        className
      )}
      {...props}
    />
  )
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
}