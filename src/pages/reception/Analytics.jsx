import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  BarChart3,
  Clock,
  Download,
  LayoutGrid,
  PieChart,
  RefreshCw,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import TopBar from '../../components/TopBar'
import { CssBarChart, CssDonutChart } from '../../components/analytics/CssCharts'
import ChaiLoader from '../../components/ChaiLoader'
import { loadReceptionAnalyticsModel } from '../../lib/receptionAnalyticsData'
import { toLocalDayKey } from '../../lib/analyticsRange'
import { exportCsv } from '../../lib/exportCsv'
import { STATUS_LABELS } from '../../lib/orderStateMachine'

function SectionCard({ title, icon: Icon, children, onExport }) {
  return (
    <section className="rounded-2xl border border-chai-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-chai-600" />}
          <h2 className="text-sm font-semibold text-chai-900 truncate">{title}</h2>
        </div>
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-chai-200 bg-chai-50 px-2 py-1.5 text-[10px] font-semibold text-chai-800 hover:bg-chai-100"
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

export default function ReceptionAnalytics() {
  const queryClient = useQueryClient()
  const dateRangeKey = toLocalDayKey(new Date().toISOString())
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['receptionAnalytics', dateRangeKey],
    queryFn: () => loadReceptionAnalyticsModel(),
    staleTime: 45_000,
  })

  const model = data

  const exportHandlers = useMemo(() => {
    if (!model) return null
    const d = model.dayKey
    return {
      summary: () =>
        exportCsv(`reception-summary-${d}.csv`, ['Metric', 'Value'], [
          ['Orders completed today', model.completedCount],
          ['Revenue today (excl. cancelled)', model.revenueToday.toFixed(2)],
          ['Average order value', model.aov.toFixed(2)],
          ['Walk-in orders', model.walkIns],
          ['Online / app orders', model.online],
          ['Table turnover index', model.turnoverRate.toFixed(2)],
        ]),
      ordersHourly: () =>
        exportCsv(`reception-orders-by-hour-${d}.csv`, ['Hour', 'Orders'], model.hourBuckets.map((n, h) => [`${h}:00`, n])),
      tables: () =>
        exportCsv(`reception-tables-${d}.csv`, ['Label', 'Status', 'Id'], model.tableReportRows),
      popular: () =>
        exportCsv(`reception-popular-today-${d}.csv`, ['Item', 'Qty'], model.popularToday.map((x) => [x.name, x.qty])),
      ordersRaw: () =>
        exportCsv(`reception-orders-today-${d}.csv`, ['Id', 'Date', 'Time', 'Status', 'Order type', 'Channel', 'Total', 'Table id'], model.orderSummaryRows),
    }
  }, [model])

  return (
    <div>
      <TopBar
        title="Today's analytics"
        rightAction={
          isFetching && !isLoading ? <RefreshCw className="h-4 w-4 animate-spin text-chai-500" /> : null
        }
      />

      <div className="space-y-4 px-4 pb-24 pt-3">
        {isLoading && (
          <div className="flex justify-center py-16">
            <ChaiLoader size={80} />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-red-700">{error.message}</p>
            <button
              type="button"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['receptionAnalytics'] })}
              className="rounded-lg bg-chai-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && model && exportHandlers && (
          <>
            <SectionCard title="Today's summary" icon={TrendingUp} onExport={exportHandlers.summary}>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-chai-600 p-3 text-white">
                  <p className="text-[10px] opacity-80">Completed</p>
                  <p className="text-2xl font-bold">{model.completedCount}</p>
                </div>
                <div className="rounded-xl bg-amber-600 p-3 text-white">
                  <p className="text-[10px] opacity-80">Revenue</p>
                  <p className="text-2xl font-bold">₹{Math.round(model.revenueToday)}</p>
                </div>
                <div className="rounded-xl border border-chai-100 bg-chai-50 p-3">
                  <p className="text-[10px] font-medium text-chai-600">AOV</p>
                  <p className="text-xl font-bold text-chai-900">₹{model.aov.toFixed(0)}</p>
                </div>
                <div className="rounded-xl border border-chai-100 bg-chai-50 p-3">
                  <p className="text-[10px] font-medium text-chai-600">Walk-in vs app</p>
                  <p className="text-sm font-bold text-chai-900">
                    {model.walkIns} · {model.online}
                  </p>
                  <p className="text-[9px] text-chai-500">walk-in / online</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Orders by hour" icon={BarChart3} onExport={exportHandlers.ordersHourly}>
              <CssBarChart
                items={model.hourBuckets.map((n, h) => ({ label: String(h), value: n }))}
              />
            </SectionCard>

            <SectionCard title="Status mix" icon={PieChart} onExport={() => exportHandlers.summary()}>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                <CssDonutChart
                  segments={model.statusPie}
                  size={140}
                  hole={0.55}
                />
                <ul className="w-full space-y-1.5 text-xs">
                  {model.statusPie.map((s) => (
                    <li key={s.label} className="flex justify-between rounded-lg bg-chai-50 px-2 py-1">
                      <span>{s.label}</span>
                      <span className="font-bold">{s.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-2 text-[10px] text-chai-500">
                {STATUS_LABELS.placed}…{STATUS_LABELS.served} grouped as in progress in the donut.
              </p>
            </SectionCard>

            <SectionCard title="Table status" icon={LayoutGrid} onExport={exportHandlers.tables}>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="rounded-xl border border-green-200 bg-green-50 p-2">
                  <p className="text-lg font-bold text-green-800">{model.occ.free}</p>
                  <p className="font-medium text-green-700">Free</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-2">
                  <p className="text-lg font-bold text-red-800">{model.occ.occupied}</p>
                  <p className="font-medium text-red-700">Busy</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-2">
                  <p className="text-lg font-bold text-amber-800">{model.occ.reserved}</p>
                  <p className="font-medium text-amber-700">Reserved</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-chai-700">
                Turnover index: completed dine-in orders today ÷ tables that completed at least one order (
                {model.turnoverRate.toFixed(2)}).
              </p>
            </SectionCard>

            <SectionCard title="Popular today" icon={UtensilsCrossed} onExport={exportHandlers.popular}>
              {model.popularToday.length === 0 ? (
                <p className="text-xs text-chai-400">No completed item lines yet today</p>
              ) : (
                <ol className="space-y-2">
                  {model.popularToday.map((x, i) => (
                    <li key={x.id} className="flex items-center justify-between rounded-xl border border-chai-100 px-3 py-2 text-xs">
                      <span className="flex items-center gap-2">
                        <span className="font-bold text-chai-400">#{i + 1}</span>
                        <span className="font-medium text-chai-900">{x.name}</span>
                      </span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                        {x.qty} sold
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </SectionCard>

            <SectionCard title="Export today's orders" icon={Users} onExport={exportHandlers.ordersRaw}>
              <p className="text-xs text-chai-600">
                Download every order placed today with channel, type, and totals for spreadsheet work.
              </p>
            </SectionCard>
          </>
        )}
      </div>
    </div>
  )
}
