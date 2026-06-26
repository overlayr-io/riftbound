import type { Request, Response, NextFunction } from 'express'
import type { DashboardMetrics } from '@riftbound/shared'
import { AnalyticsService } from '../services/analytics.service'
import { AnalyticsRepository } from '../repositories/analytics.repository'
import { QuotaService } from '../services/quota.service'

const service = new AnalyticsService(new AnalyticsRepository())
const quotaService = new QuotaService()

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const days = typeof req.query.days === 'string' ? Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 14)) : 14
    res.json(await service.dashboard(days))
  } catch (err) { next(err) }
}

export async function getHealth(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.health()) } catch (err) { next(err) }
}

export async function getRevenue(_req: Request, res: Response, next: NextFunction) {
  try { res.json(service.revenue()) } catch (err) { next(err) }
}

export async function getQuota(_req: Request, res: Response, next: NextFunction) {
  try {
    const [metrics] = await Promise.all([service.dashboard(1)])
    const gamesCreatedToday = metrics.gamesCreatedPerDay.at(-1)?.value ?? 0
    res.json(await quotaService.get(metrics.totals.games, gamesCreatedToday))
  } catch (err) { next(err) }
}

function toCsv(m: DashboardMetrics): string {
  const rows: string[] = ['date,signups,games_created,games_ended,games_abandoned']
  const byDate = new Map<string, number[]>()
  const put = (arr: { date: string; value: number }[], idx: number) => {
    for (const p of arr) {
      if (!byDate.has(p.date)) byDate.set(p.date, [0, 0, 0, 0])
      byDate.get(p.date)![idx] = p.value
    }
  }
  put(m.signupsPerDay, 0); put(m.gamesCreatedPerDay, 1); put(m.gamesEndedPerDay, 2); put(m.gamesAbandonedPerDay, 3)
  for (const [date, v] of [...byDate.entries()].sort()) rows.push(`${date},${v[0]},${v[1]},${v[2]},${v[3]}`)
  rows.push('')
  rows.push(`# totals_users,${m.totals.users}`)
  rows.push(`# totals_games,${m.totals.games}`)
  rows.push(`# dau,${m.active.dau}`)
  rows.push(`# wau,${m.active.wau}`)
  rows.push(`# mau,${m.active.mau}`)
  rows.push(`# abandon_rate,${m.abandonRate.toFixed(3)}`)
  return rows.join('\n')
}

export async function exportMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const metrics = await service.dashboard(typeof req.query.days === 'string' ? parseInt(req.query.days, 10) || 14 : 14)
    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="riftbound-metrics.csv"')
      res.send(toCsv(metrics))
      return
    }
    res.setHeader('Content-Disposition', 'attachment; filename="riftbound-metrics.json"')
    res.json(metrics)
  } catch (err) { next(err) }
}
