"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import {
  MessageSquare, Bot, FileText, ImageIcon,
  Search, Settings, BarChart3, Plus,
  LayoutDashboard, Database, ListChecks, Layers, Globe,
  ChevronLeft, Sparkles, Trash2,
} from "lucide-react"

interface Workspace {
  id: number; name: string; icon: string
}

export function Sidebar() {
  const pathname = usePathname()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const match = pathname.match(/\/workspaces\/(\d+)/)
  const activeWsId = match ? Number(match[1]) : null

  useEffect(() => {
    api.listWorkspaces().then((d) => setWorkspaces(d.workspaces)).catch(() => {})
  }, [])

  const wsNavItems = activeWsId
    ? [
        { href: `/workspaces/${activeWsId}`, label: "Overview", icon: LayoutDashboard },
        { href: `/workspaces/${activeWsId}/chats`, label: "Chats", icon: MessageSquare },
        { href: `/workspaces/${activeWsId}/documents`, label: "Knowledge", icon: Database },
        { href: `/workspaces/${activeWsId}/memory`, label: "Memory", icon: Layers },
        { href: `/workspaces/${activeWsId}/agents`, label: "Agents", icon: Bot },
        { href: `/workspaces/${activeWsId}/assets`, label: "Assets", icon: FileText },
        { href: `/workspaces/${activeWsId}/tasks`, label: "Tasks", icon: ListChecks },
        { href: `/workspaces/${activeWsId}/browser`, label: "Browser", icon: Globe },
        { href: `/workspaces/${activeWsId}/settings`, label: "Settings", icon: Settings },
      ]
    : []

  const activeWorkspace = workspaces.find((w) => w.id === activeWsId)

  return (
    <div className="w-60 h-screen bg-card border-r border-border flex flex-col select-none">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <Link href="/workspaces" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">LocalGPT</span>
        </Link>
        <Link href="/workspaces">
          <div className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center cursor-pointer">
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </Link>
      </div>

      {/* Active workspace header */}
      {activeWorkspace && (
        <div className="px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
              {activeWorkspace.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{activeWorkspace.name}</p>
            </div>
            <Link href="/workspaces">
              <div className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center cursor-pointer">
                <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Workspace navigation */}
      {activeWsId ? (
        <div className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {wsNavItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== `/workspaces/${activeWsId}` && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer",
                    active
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        /* Workspace list (when no workspace selected) */
        <div className="flex-1 p-2 overflow-y-auto">
          <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Workspaces</p>
          {workspaces.map((ws) => (
            <Link key={ws.id} href={`/workspaces/${ws.id}`}>
              <div
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer",
                  "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary shrink-0">
                  {ws.name[0]}
                </div>
                <span className="truncate">{ws.name}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Global links */}
      <div className="p-2 border-t border-border">
        <div className="space-y-0.5">
          <Link href="/prompts">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 cursor-pointer">
              <Globe className="h-4 w-4 shrink-0" />
              <span>Prompts</span>
            </div>
          </Link>
          <Link href="/images">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 cursor-pointer">
              <ImageIcon className="h-4 w-4 shrink-0" />
              <span>Images</span>
            </div>
          </Link>
          <Link href="/research">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 cursor-pointer">
              <Search className="h-4 w-4 shrink-0" />
              <span>Research</span>
            </div>
          </Link>
          <Link href="/admin">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 cursor-pointer">
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span>Admin</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
