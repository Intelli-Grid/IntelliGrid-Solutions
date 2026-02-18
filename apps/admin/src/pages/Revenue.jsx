
import { useState, useEffect } from 'react'
import { DollarSign, RefreshCw, Download, Calendar, Loader2, TrendingUp, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminService } from '../services'
import { toast } from 'react-hot-toast'
import { format, subDays, startOfDay, isSameDay } from 'date-fns'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const Revenue = () => {
    const [payments, setPayments] = useState([])
    const [stats, setStats] = useState({ totalRevenue: 0, activeSubs: 0 })
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [chartData, setChartData] = useState([])

    useEffect(() => {
        fetchData()
    }, [page])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [statsData, paymentsData] = await Promise.all([
                adminService.getStats(),
                adminService.getPayments({ page, limit: 20 })
            ])

            if (statsData.success) {
                setStats({
                    totalRevenue: statsData.stats.totalRevenue,
                    activeSubs: statsData.stats.activeProUsers
                })
            }

            if (paymentsData.success) {
                setPayments(paymentsData.payments)
                setTotalPages(paymentsData.pagination.pages)

                // process chart data from payments (client-side approximation)
                // In a real app, we'd hit /admin/revenue/history
                const processed = processChartData(paymentsData.payments)
                setChartData(processed)
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to load revenue data')
        } finally {
            setLoading(false)
        }
    }

    const processChartData = (txs) => {
        // Create last 7 days buckets
        const days = Array.from({ length: 7 }, (_, i) => {
            const date = subDays(new Date(), 6 - i)
            return {
                date: format(date, 'MMM dd'),
                rawDate: date,
                amount: 0
            }
        })

        txs.forEach(tx => {
            const txDate = new Date(tx.createdAt)
            const day = days.find(d => isSameDay(d.rawDate, txDate))
            if (day) {
                day.amount += (tx.amount?.total || 0)
            }
        })

        return days
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 mb-1">Revenue & Billing</h1>
                    <p className="text-slate-400 text-sm">Monitor earnings and manage subscription payments.</p>
                </div>
                <button className="px-4 py-2 bg-[#2a2d3a] hover:bg-[#3a3d4a] text-slate-200 text-sm rounded-lg border border-[#3a3d4a] transition-all flex items-center gap-2">
                    <Download size={14} />
                    Export CSV
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <DollarSign size={64} />
                    </div>
                    <div className="relative z-10">
                        <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">Total Revenue</div>
                        <div className="text-3xl font-bold text-emerald-400">${stats.totalRevenue.toLocaleString()}</div>
                        <div className="flex items-center gap-1 text-emerald-500/80 text-xs mt-2 font-medium">
                            <TrendingUp size={12} />
                            <span>+12.5% this month</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <CreditCard size={64} />
                    </div>
                    <div className="relative z-10">
                        <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">Active Subscribers</div>
                        <div className="text-3xl font-bold text-indigo-400">{stats.activeSubs}</div>
                        <div className="text-slate-500 text-xs mt-2">
                            Pro Plan members
                        </div>
                    </div>
                </div>

                {/* Mini Chart */}
                <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-6 flex flex-col justify-between">
                    <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">7-Day Trend</div>
                    <div className="h-24 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="amount" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden min-h-[400px] flex flex-col">
                <div className="px-6 py-4 border-b border-[#2a2d3a] flex justify-between items-center">
                    <h3 className="font-semibold text-slate-200">Recent Transactions</h3>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                        <Calendar size={12} />
                        Last 30 days
                    </div>
                </div>

                {loading && payments.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="animate-spin text-indigo-500" size={32} />
                    </div>
                ) : payments.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                        <DollarSign size={32} className="text-slate-600 mb-2" />
                        <p className="text-slate-500">No transactions found.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#2a2d3a] bg-[#222530]">
                                        <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">User</th>
                                        <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Amount</th>
                                        <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Status</th>
                                        <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Date</th>
                                        <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold text-right">Invoice</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#2a2d3a]">
                                    {payments.map(tx => (
                                        <tr key={tx._id} className="group hover:bg-[#222530] transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                                        {tx.user?.firstName?.[0] || '?'}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-200">{tx.user ? `${tx.user.firstName} ${tx.user.lastName}` : 'Unknown User'}</div>
                                                        <div className="text-xs text-slate-500">{tx.user?.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="font-mono text-slate-200">${(tx.amount?.total || 0).toFixed(2)}</span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                        tx.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                    }`}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-slate-400">
                                                {format(new Date(tx.createdAt), 'MMM d, HH:mm')}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <button className="text-indigo-400 hover:underline text-xs font-medium">
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        <div className="border-t border-[#2a2d3a] p-4 flex items-center justify-between">
                            <div className="text-xs text-slate-500">
                                Page {page} of {totalPages}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-1 px-2 rounded border border-[#2a2d3a] text-slate-400 hover:text-slate-200 hover:bg-[#2a2d3a] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-1 px-2 rounded border border-[#2a2d3a] text-slate-400 hover:text-slate-200 hover:bg-[#2a2d3a] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default Revenue
