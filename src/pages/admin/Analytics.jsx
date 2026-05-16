import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  BarChart3,
  CalendarRange,
  Clock,
  Download,
  FileSpreadsheet,
  LayoutGrid,
  PieChart,
  RefreshCw,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import TopBar from '../../components/TopBar'
import { CssBarChart, CssDonutChart, CssLineChart } from '../../components/analytics/CssCharts'
import { StatSkeleton } from '../../components/Skeleton'
import { RANGE_PRESETS, resolveAnalyticsRange } from '../../lib/analyticsRange'
import { loadAdminAnalyticsModel } from '../../lib/adminAnalyticsData'
import { downloadCsv, exportCsv, rowsToCsv } from '../../lib/exportCsv'

const DONUT_COLORS = [
  '#d97706', '#b45309', '#92400e', '#78350f', '#fde68a', '#f59e0b', '#fbbf24', '#451a03',
]

function SectionCard({ title, icon: Icon, children, onExport, exportLabel = 'Export CSV' }) {
  return (
    <section className="rounded-2xl border border-chai-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-chai-600" />}
          <h2 className="text-sm font-semibold text-chai-900 truncate">{title}</h2>
        </div>
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-chai-200 bg-chai-50 px-2 py-1.5 text-[10px] font-semibold text-chai-800 transition-colors hover:bg-chai-100"
          >
            <Download className="h-3 w-3" />
            {exportLabel}
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

export default function AdminAnalytics() {
  const queryClient = useQueryClient()
  const [preset, setPreset] = useState('last30')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [trendDays, setTrendDays] = useState(7)

  const rangeArg = preset === 'custom' ? 'custom' : preset
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['adminAnalytics', { preset: rangeArg, customStart, customEnd, trendDays }],
    queryFn: () => loadAdminAnalyticsModel(rangeArg, customStart, customEnd, trendDays),
    staleTime: 45_000,
    enabled: preset !== 'custom' || Boolean(customStart && customEnd),
  })

  const model = data
  const rangeLabel = model?.range.label ?? resolveAnalyticsRange(rangeArg, customStart, customEnd).label

  const exportHandlers = useMemo(() => {
    if (!model) return null
    const r = model.rangeSummary
    const rk = model.revenueKpis
    return {
      revenue: () =>
        exportCsv(`admin-revenue-${rangeLabel.replace(/\s+/g, '-')}.csv`, ['Window', 'Revenue (completed, ₹)'], [
          ['Today', rk.today.toFixed(2)],
          ['This week (rolling 7d)', rk.week.toFixed(2)],
          ['This month (MTD)', rk.month.toFixed(2)],
          ['All time', rk.all.toFixed(2)],
          ['Selected period', r.revenue.toFixed(2)],
          ['Selected period gross (excl. cancelled)', r.gross.toFixed(2)],
          ['Avg order value (completed, period)', r.aov.toFixed(2)],
        ]),
      revenueTrend: () =>
        exportCsv(`admin-revenue-trend-${rangeLabel}.csv`, ['Date', 'Revenue'], model.revenueTrend.map((x) => [x.dayKey, x.value.toFixed(2)])),
      categories: () =>
        exportCsv(`admin-revenue-by-category-${rangeLabel}.csv`, ['Category', 'Revenue'], model.categoryDist.map((c) => [c.name, c.value.toFixed(2)])),
      orders: () =>
        exportCsv(`admin-orders-${rangeLabel}.csv`, ['Metric', 'Count'], [
          ['Completed', model.statusCounts.completed],
          ['Cancelled', model.statusCounts.cancelled],
          ['In progress', model.statusCounts.pending],
          ['Total in period', model.rangeSummary.orders],
        ]),
      ordersTrend: () =>
        exportCsv(`admin-orders-daily-${rangeLabel}.csv`, ['Date', 'Orders'], model.ordersTrend.map((x) => [x.dayKey, x.value])),
      peakHours: () =>
        exportCsv(`admin-peak-hours-${rangeLabel}.csv`, ['Hour', 'Orders'], model.hourBuckets.map((n, h) => [`${h}:00`, n])),
      menuTop: () =>
        exportCsv(`admin-menu-top-${rangeLabel}.csv`, ['Rank', 'Item', 'Qty', 'Revenue'], model.top10.map((x, i) => [i + 1, x.name, x.qty, x.revenue.toFixed(2)])),
      menuBottom: () =>
        exportCsv(`admin-menu-bottom-${rangeLabel}.csv`, ['Rank', 'Item', 'Qty', 'Revenue'], [...model.bottom5].map((x, i) => [i + 1, x.name, x.qty, x.revenue.toFixed(2)])),
      menuCategoryDist: () =>
        exportCsv(`admin-menu-category-qty-${rangeLabel}.csv`, ['Category', 'Revenue (completed lines)'], model.categoryDist.map((c) => [c.name, c.value.toFixed(2)])),
      menuItemRev: () =>
        exportCsv(`admin-menu-item-revenue-${rangeLabel}.csv`, ['Item', 'Qty', 'Revenue'], model.itemRevRows.map((x) => [x.name, x.qty, x.revenue.toFixed(2)])),
      users: () =>
        exportCsv(`admin-users-by-role-${rangeLabel}.csv`, ['Role', 'Count'], Object.entries(model.roleCounts).map(([role, n]) => [role, n])),
      signups: () =>
        exportCsv(`admin-signups-${rangeLabel}.csv`, ['Date', 'New profiles'], model.signupTrend.map((x) => [x.dayKey, x.value])),
      customers: () =>
        exportCsv(`admin-top-customers-${rangeLabel}.csv`, ['Name', 'Orders', 'Spend'], model.topCustomers.map((c) => [c.name, c.orders, c.spend.toFixed(2)])),
      prep: () =>
        exportCsv(`admin-prep-${rangeLabel}.csv`, ['Field', 'Value'], [
          ['Note', model.prepNote],
          ['Avg minutes (subset)', model.avgPrepMinutes != null ? model.avgPrepMinutes.toFixed(2) : ''],
        ]),
      tables: () =>
        exportCsv(`admin-tables-daily-activity-${rangeLabel}.csv`, ['Date', 'Dine-in completed touches'], model.utilizationDays.map((d) => [d.dayKey, d.value])),
      tableUsage: () =>
        exportCsv(`admin-table-usage-${rangeLabel}.csv`, ['Table', 'Orders', 'Completed'], model.tableUsageList.map((t) => [t.label, t.orders, t.completed])),
      full: () => {
        const safeName = rangeLabel.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '-')
        const blocks = [
          rowsToCsv(['Section', 'Field', 'Value'], [
            ['Revenue KPIs', 'Today (completed)', rk.today.toFixed(2)],
            ['Revenue KPIs', 'Week', rk.week.toFixed(2)],
            ['Revenue KPIs', 'Month MTD', rk.month.toFixed(2)],
            ['Revenue KPIs', 'All time', rk.all.toFixed(2)],
            ['Selected period', 'Revenue (completed)', r.revenue.toFixed(2)],
            ['Selected period', 'Orders', r.orders],
            ['Selected period', 'Completed', r.completed],
            ['Selected period', 'AOV', r.aov.toFixed(2)],
            ['Selected period', 'Cancelled', r.cancelled],
            ['Prep', 'Note', model.prepNote],
            ['Prep', 'Avg minutes (subset)', model.avgPrepMinutes != null ? model.avgPrepMinutes.toFixed(1) : ''],
          ]),
          rowsToCsv(['Series', 'Date', 'Amount'], model.revenueTrend.map((x) => ['Daily revenue', x.dayKey, x.value.toFixed(2)])),
          rowsToCsv(['Series', 'Date', 'Count'], model.ordersTrend.map((x) => ['Daily orders', x.dayKey, x.value])),
          rowsToCsv(['Series', 'Hour', 'Orders'], model.hourBuckets.map((n, h) => ['Peak hour', `${h}`, n])),
          rowsToCsv(['Category', 'Name', 'Amount'], model.categoryDist.map((c) => ['Category', c.name, c.value.toFixed(2)])),
          rowsToCsv(['Top items', 'Item', 'Qty', 'Revenue'], model.top10.map((x) => ['Top', x.name, x.qty, x.revenue.toFixed(2)])),
          rowsToCsv(['Customers', 'Name', 'Orders', 'Spend'], model.topCustomers.map((c) => ['Customer', c.name, c.orders, c.spend.toFixed(2)])),
          rowsToCsv(['Tables', 'Label', 'Orders', 'Completed'], model.tableUsageList.map((t) => ['Table', t.label, t.orders, t.completed])),
        ]
        downloadCsv(`admin-analytics-full-${safeName}.csv`, blocks.join('\r\n\r\n'))
      },
    }
  }, [model, rangeLabel])

  return (
    <div>
      <TopBar
        title="Analytics"
        rightAction={
          model && exportHandlers ? (
            <button
              type="button"
              onClick={() => exportHandlers.full()}
              className="inline-flex items-center gap-1 rounded-lg bg-chai-700 px-2 py-1.5 text-[11px] font-semibold text-white shadow-sm"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Full CSV
            </button>
          ) : null
        }
      />

      <div className="space-y-4 px-4 pb-24 pt-3">
        <div className="rounded-2xl border border-chai-100 bg-gradient-to-br from-chai-50 to-amber-50/40 p-3 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-chai-800">
              <CalendarRange className="h-4 w-4" />
              <span className="text-xs font-semibold">Date range</span>
              {isFetching && !isLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-chai-500" />}
            </div>
            <span className="text-[10px] font-medium text-chai-600 truncate max-w-[10rem]">{rangeLabel}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {RANGE_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPreset(p)}
                className={`rounded-full px-3 py-1 text-[10px] font-semibold capitalize transition-colors ${
                  preset === p ? 'bg-chai-700 text-white' : 'bg-white text-chai-700 ring-1 ring-chai-200'
                }`}
              >
                {p === 'today'
                  ? 'Today'
                  : p === 'last7'
                    ? '7d'
                    : p === 'last14'
                      ? '14d'
                      : p === 'last30'
                        ? '30d'
                        : p === 'thisMonth'
                          ? 'Month'
                          : p === 'all'
                            ? 'All'
                            : p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPreset('custom')}
              className={`rounded-full px-3 py-1 text-[10px] font-semibold transition-colors ${
                preset === 'custom' ? 'bg-chai-700 text-white' : 'bg-white text-chai-700 ring-1 ring-chai-200'
              }`}
            >
              Custom
            </button>
          </div>
          {preset === 'custom' && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-0.5 text-[10px] font-medium text-chai-600">
                Start
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded-lg border border-chai-200 px-2 py-1 text-xs"
                />
              </label>
              <label className="flex flex-col gap-0.5 text-[10px] font-medium text-chai-600">
                End
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded-lg border border-chai-200 px-2 py-1 text-xs"
                />
              </label>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-chai-100 pt-2">
            <span className="text-[10px] font-medium text-chai-600">Trend bars</span>
            {([7, 14, 30]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setTrendDays(d)}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                  trendDays === d ? 'bg-amber-600 text-white' : 'bg-white text-amber-900 ring-1 ring-amber-200'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {preset === 'custom' && (!customStart || !customEnd) && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">Pick start and end dates to load analytics.</p>
        )}

        {isLoading && (
          <div className="space-y-3 pt-2">
            <StatSkeleton tiles={2} />
            <StatSkeleton tiles={2} />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-red-700">{error.message}</p>
            <button
              type="button"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['adminAnalytics'] })}
              className="rounded-lg bg-chai-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && model && exportHandlers && (
          <>
            <SectionCard title="Revenue" icon={TrendingUp} onExport={exportHandlers.revenue}>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-chai-600 p-3 text-white">
                  <p className="text-[10px] opacity-80">Today</p>
                  <p className="text-lg font-bold">₹{Math.round(model.revenueKpis.today)}</p>
                </div>
                <div className="rounded-xl bg-amber-700 p-3 text-white">
                  <p className="text-[10px] opacity-80">This week</p>
                  <p className="text-lg font-bold">₹{Math.round(model.revenueKpis.week)}</p>
                </div>
                <div className="rounded-xl bg-amber-600 p-3 text-white">
                  <p className="text-[10px] opacity-80">This month</p>
                  <p className="text-lg font-bold">₹{Math.round(model.revenueKpis.month)}</p>
                </div>
                <div className="rounded-xl bg-chai-800 p-3 text-white">
                  <p className="text-[10px] opacity-80">All time</p>
                  <p className="text-lg font-bold">₹{Math.round(model.revenueKpis.all)}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="rounded-lg bg-chai-50 p-2">
                  <p className="font-semibold text-chai-900">Period</p>
                  <p className="text-sm font-bold text-chai-700">₹{Math.round(model.rangeSummary.revenue)}</p>
                </div>
                <div className="rounded-lg bg-chai-50 p-2">
                  <p className="font-semibold text-chai-900">AOV</p>
                  <p className="text-sm font-bold text-chai-700">₹{model.rangeSummary.aov.toFixed(0)}</p>
                </div>
                <div className="rounded-lg bg-chai-50 p-2">
                  <p className="font-semibold text-chai-900">Orders</p>
                  <p className="text-sm font-bold text-chai-700">{model.rangeSummary.orders}</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Revenue trend" icon={BarChart3} onExport={exportHandlers.revenueTrend}>
              <CssBarChart
                items={model.revenueTrend.map((x) => ({ label: x.label, value: Math.round(x.value) }))}
              />
              <div className="mt-3">
                <p className="mb-1 text-[10px] font-medium text-chai-600">Line view</p>
                <CssLineChart points={model.linePoints} />
              </div>
            </SectionCard>

            <SectionCard title="Revenue by category" icon={PieChart} onExport={exportHandlers.categories}>
              {model.categoryDist.length === 0 ? (
                <p className="text-center text-xs text-chai-400">No completed sales in this period</p>
              ) : (
                <>
                  <CssDonutChart
                    segments={model.categoryDist.map((c, i) => ({
                      label: c.name,
                      value: c.value,
                      color: DONUT_COLORS[i % DONUT_COLORS.length],
                    }))}
                  />
                  <ul className="mt-3 space-y-1.5">
                    {model.categoryDist.slice(0, 8).map((c, i) => (
                      <li key={c.name} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 truncate">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                          />
                          <span className="truncate font-medium text-chai-800">{c.name}</span>
                        </span>
                        <span className="shrink-0 font-semibold text-chai-700">₹{Math.round(c.value)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </SectionCard>

            <SectionCard title="Orders" icon={BarChart3} onExport={exportHandlers.orders}>
              <div className="mb-3 grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="rounded-xl bg-emerald-50 p-2 ring-1 ring-emerald-100">
                  <p className="font-semibold text-emerald-800">Done</p>
                  <p className="text-lg font-bold text-emerald-900">{model.statusCounts.completed}</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-2 ring-1 ring-amber-100">
                  <p className="font-semibold text-amber-900">Active</p>
                  <p className="text-lg font-bold text-amber-950">{model.statusCounts.pending}</p>
                </div>
                <div className="rounded-xl bg-red-50 p-2 ring-1 ring-red-100">
                  <p className="font-semibold text-red-800">Cancelled</p>
                  <p className="text-lg font-bold text-red-900">{model.statusCounts.cancelled}</p>
                </div>
              </div>
              <CssDonutChart
                size={140}
                hole={0.55}
                segments={[
                  { label: 'Completed', value: model.statusCounts.completed, color: '#059669' },
                  { label: 'In progress', value: model.statusCounts.pending, color: '#d97706' },
                  { label: 'Cancelled', value: model.statusCounts.cancelled, color: '#dc2626' },
                ]}
              />
            </SectionCard>

            <SectionCard title="Orders over time" icon={TrendingUp} onExport={exportHandlers.ordersTrend}>
              <CssLineChart
                points={model.ordersTrend.map((x) => ({ x: 0, y: x.value }))}
                strokeClass="stroke-chai-700"
                fillClass="fill-chai-200/40"
              />
            </SectionCard>

            <SectionCard title="Peak hours" icon={Clock} onExport={exportHandlers.peakHours}>
              <CssBarChart
                items={model.hourBuckets.map((n, h) => ({
                  label: String(h),
                  value: n,
                }))}
              />
            </SectionCard>

            <SectionCard title="Preparation time" icon={Clock} onExport={exportHandlers.prep}>
              <p className="text-xs text-chai-600 leading-relaxed">{model.prepNote}</p>
              {model.avgPrepMinutes != null && (
                <p className="mt-2 text-2xl font-bold text-chai-800">{model.avgPrepMinutes.toFixed(1)} min</p>
              )}
            </SectionCard>

            <SectionCard title="Top menu items" icon={UtensilsCrossed} onExport={exportHandlers.menuTop}>
              <CssBarChart
                items={model.top10.map((x) => ({ label: x.name.slice(0, 10), value: x.qty, sublabel: `₹${Math.round(x.revenue)}` }))}
              />
              <ol className="mt-3 space-y-1.5">
                {model.top10.map((x, i) => (
                  <li key={x.id} className="flex items-center justify-between text-xs">
                    <span className="text-chai-600">{i + 1}.</span>
                    <span className="flex-1 truncate px-2 font-medium text-chai-900">{x.name}</span>
                    <span className="text-chai-700">{x.qty} pcs · ₹{Math.round(x.revenue)}</span>
                  </li>
                ))}
              </ol>
            </SectionCard>

            <SectionCard title="Slowest movers" icon={UtensilsCrossed} onExport={exportHandlers.menuBottom}>
              {model.bottom5.length === 0 ? (
                <p className="text-xs text-chai-400">Not enough data</p>
              ) : (
                <ul className="space-y-2">
                  {model.bottom5.map((x) => (
                    <li key={x.id} className="flex items-center justify-between rounded-lg bg-chai-50 px-2 py-1.5 text-xs">
                      <span className="truncate font-medium text-chai-900">{x.name}</span>
                      <span className="shrink-0 text-chai-600">{x.qty} sold</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Category sales (menu)" icon={PieChart} onExport={exportHandlers.menuCategoryDist}>
              <CssBarChart
                palette={['bg-amber-500', 'bg-orange-700', 'bg-yellow-600']}
                items={model.categoryDist.slice(0, 8).map((c) => ({ label: c.name.slice(0, 8), value: Math.round(c.value) }))}
              />
            </SectionCard>

            <SectionCard title="Item revenue" icon={PieChart} onExport={exportHandlers.menuItemRev}>
              <ol className="max-h-48 space-y-1.5 overflow-y-auto">
                {model.itemRevRows.slice(0, 15).map((x, i) => (
                  <li key={x.id} className="flex items-center justify-between text-xs">
                    <span className="text-chai-500">{i + 1}</span>
                    <span className="flex-1 truncate px-2 font-medium">{x.name}</span>
                    <span>₹{Math.round(x.revenue)}</span>
                  </li>
                ))}
              </ol>
            </SectionCard>

            <SectionCard title="Users by role" icon={Users} onExport={exportHandlers.users}>
              <CssBarChart
                items={Object.entries(model.roleCounts).map(([k, v]) => ({ label: k.slice(0, 8), value: v }))}
              />
            </SectionCard>

            <SectionCard title="New signups" icon={Users} onExport={exportHandlers.signups}>
              <CssLineChart
                points={model.signupTrend.map((x) => ({ x: 0, y: x.value }))}
                strokeClass="stroke-amber-700"
              />
            </SectionCard>

            <SectionCard title="Top customers" icon={Users} onExport={exportHandlers.customers}>
              {model.topCustomers.length === 0 ? (
                <p className="text-xs text-chai-400">No registered customer spend in this period</p>
              ) : (
                <ul className="space-y-2">
                  {model.topCustomers.map((c) => (
                    <li key={c.userId} className="flex items-center justify-between rounded-xl border border-chai-100 bg-chai-50/50 px-3 py-2 text-xs">
                      <span className="truncate font-medium text-chai-900">{c.name}</span>
                      <span className="shrink-0 text-chai-700">{c.orders} orders · ₹{Math.round(c.spend)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Table utilization" icon={LayoutGrid} onExport={exportHandlers.tables}>
              <p className="mb-2 text-[11px] text-chai-600">
                Dine-in completed orders per day (proxy — historical occupancy is not logged).
              </p>
              <CssBarChart
                items={model.utilizationDays.map((d) => ({ label: d.label, value: d.value }))}
              />
            </SectionCard>

            <SectionCard title="Table usage ranking" icon={LayoutGrid} onExport={exportHandlers.tableUsage}>
              {model.tableUsageList.length === 0 ? (
                <p className="text-xs text-chai-400">No table-linked orders in period</p>
              ) : (
                <ul className="space-y-1.5">
                  {model.tableUsageList.slice(0, 10).map((t, idx) => (
                    <li key={t.id} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-chai-900">{idx === 0 ? '🏆' : `${idx + 1}.`} {t.label}</span>
                      <span className="text-chai-600">{t.orders} orders · {t.completed} done</span>
                    </li>
                  ))}
                  {model.tableUsageList.length > 1 && (
                    <li className="border-t border-chai-100 pt-2 text-[10px] text-chai-500">
                      Least used: {model.tableUsageList[model.tableUsageList.length - 1]?.label}
                    </li>
                  )}
                </ul>
              )}
            </SectionCard>

            <div className="rounded-xl border border-dashed border-chai-200 bg-chai-50/50 p-3 text-center text-[11px] text-chai-600">
              Snapshot: {model.occSnapshot.occupied}/{model.occSnapshot.total} tables occupied now · {model.occSnapshot.free} free
            </div>
          </>
        )}
      </div>
    </div>
  )
}
