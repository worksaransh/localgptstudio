"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, MessageSquare, FileText, Cpu, Database, Zap } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface Metrics {
  chat_count: number
  message_count: number
  document_count: number
  total_tokens: number
  api_call_count: number
  cpu_percent: number
  ram_percent: number
  ram_total_gb: number
}

interface Log {
  id: number
  endpoint: string
  method: string
  tokens_used: number
  duration_ms: number
  status_code: number
  created_at: string
}

export default function AdminPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([loadMetrics(), loadLogs()]).finally(() => setLoading(false))
  }, [])

  async function loadMetrics() {
    try {
      const data = await api.getMetrics()
      setMetrics(data.metrics)
    } catch {}
  }

  async function loadLogs() {
    try {
      const data = await api.getLogs()
      setLogs(data.logs)
    } catch {}
  }

  if (loading) {
    return <div className="h-full flex items-center justify-center text-muted-foreground">Loading...</div>
  }

  const stats = [
    { label: "Chats", value: metrics?.chat_count || 0, icon: MessageSquare },
    { label: "Messages", value: metrics?.message_count || 0, icon: MessageSquare },
    { label: "Documents", value: metrics?.document_count || 0, icon: FileText },
    { label: "Total Tokens", value: (metrics?.total_tokens || 0).toLocaleString(), icon: Zap },
    { label: "API Calls", value: metrics?.api_call_count || 0, icon: Database },
    { label: "CPU", value: `${metrics?.cpu_percent || 0}%`, icon: Cpu },
    { label: "RAM", value: `${metrics?.ram_percent || 0}% of ${metrics?.ram_total_gb || 0}GB`, icon: Cpu },
  ]

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" /> Admin Dashboard
        </h1>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>API Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-2">Endpoint</th>
                    <th className="text-left py-2 px-2">Method</th>
                    <th className="text-right py-2 px-2">Tokens</th>
                    <th className="text-right py-2 px-2">Duration</th>
                    <th className="text-right py-2 px-2">Status</th>
                    <th className="text-right py-2 px-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 font-mono text-xs">{log.endpoint}</td>
                      <td className="py-2 px-2">{log.method}</td>
                      <td className="py-2 px-2 text-right">{log.tokens_used}</td>
                      <td className="py-2 px-2 text-right">{log.duration_ms.toFixed(0)}ms</td>
                      <td className="py-2 px-2 text-right">{log.status_code}</td>
                      <td className="py-2 px-2 text-right text-xs">{formatDate(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
