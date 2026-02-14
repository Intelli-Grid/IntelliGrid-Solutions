import { useState, useEffect } from 'react'
import { Activity, Database, Server, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import api from '../../utils/api'

export default function SystemHealthPage() {
    const [loading, setLoading] = useState(true)
    const [healthData, setHealthData] = useState(null)
    const [error, setError] = useState(null)

    const checkHealth = async () => {
        try {
            setLoading(true)
            setError(null)
            // Use direct fetch or axios instance that points to base URL + /health
            // Since api instance usually points to /api/v1, we might need to adjust.
            // But let's assume /health is at root? 
            // In app.js: app.get('/health') is at root, NOT under /api/v1.

            // api instance likely has baseURL set to /api/v1. 
            // We need to fetch from root.
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000'
            const response = await fetch(`${baseUrl}/health`)
            const data = await response.json()

            if (response.ok) {
                setHealthData(data)
            } else {
                setError('System Unhealthy')
                setHealthData(data) // Might contain error details
            }
        } catch (err) {
            console.error('Health check failed:', err)
            setError('Failed to connect to server')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        checkHealth()
        const interval = setInterval(checkHealth, 30000) // Auto-refresh every 30s
        return () => clearInterval(interval)
    }, [])

    const getStatusColor = (status) => {
        return status === 'connected' || status === 'success' ? 'text-accent-emerald' : 'text-error'
    }

    const getStatusIcon = (status) => {
        return status === 'connected' || status === 'success' ? <CheckCircle className="w-5 h-5 text-accent-emerald" /> : <XCircle className="w-5 h-5 text-error" />
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary-900 to-deep-space">
            <div className="max-w-4xl mx-auto px-6 py-16">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <Activity className="w-8 h-8 text-accent-cyan" />
                            System Health
                        </h1>
                        <p className="text-gray-400">Real-time monitoring of system components</p>
                    </div>
                    <button
                        onClick={checkHealth}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white"
                        disabled={loading}
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {error && (
                    <div className="bg-error/10 border border-error/20 text-error p-4 rounded-xl mb-6 flex items-center gap-3">
                        <XCircle className="w-6 h-6" />
                        <div>
                            <p className="font-semibold">System Alert</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Database Status */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-accent-purple/20 rounded-xl">
                                    <Database className="w-6 h-6 text-accent-purple" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Database</h3>
                                    <p className="text-xs text-gray-400">MongoDB Atlas</p>
                                </div>
                            </div>
                            {loading ? (
                                <div className="w-20 h-6 bg-white/10 animate-pulse rounded"></div>
                            ) : (
                                <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full">
                                    {getStatusIcon(healthData?.services?.database)}
                                    <span className={`text-sm font-medium ${getStatusColor(healthData?.services?.database)} capitalize`}>
                                        {healthData?.services?.database || 'Unknown'}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1 mt-4">
                            <div className={`h-1 rounded-full ${healthData?.services?.database === 'connected' ? 'bg-accent-purple' : 'bg-gray-700'} w-full transition-all duration-500`}></div>
                        </div>
                    </div>

                    {/* API Server Status */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-accent-cyan/20 rounded-xl">
                                    <Server className="w-6 h-6 text-accent-cyan" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">API Server</h3>
                                    <p className="text-xs text-gray-400">Railway / Node.js</p>
                                </div>
                            </div>
                            {loading ? (
                                <div className="w-20 h-6 bg-white/10 animate-pulse rounded"></div>
                            ) : (
                                <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full">
                                    {getStatusIcon(healthData ? 'success' : 'error')}
                                    <span className={`text-sm font-medium ${healthData ? 'text-accent-cyan' : 'text-error'} capitalize`}>
                                        {healthData ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1 mt-4">
                            <div className={`h-1 rounded-full ${healthData ? 'bg-accent-cyan' : 'bg-gray-700'} w-full transition-all duration-500`}></div>
                        </div>
                    </div>

                    {/* Redis Status */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-accent-rose/20 rounded-xl">
                                    <Activity className="w-6 h-6 text-accent-rose" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Redis Cache</h3>
                                    <p className="text-xs text-gray-400">Cloud Memory Store</p>
                                </div>
                            </div>
                            {loading ? (
                                <div className="w-20 h-6 bg-white/10 animate-pulse rounded"></div>
                            ) : (
                                <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full">
                                    {getStatusIcon(healthData?.services?.redis)}
                                    <span className={`text-sm font-medium ${getStatusColor(healthData?.services?.redis)} capitalize`}>
                                        {healthData?.services?.redis || 'Unknown'}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1 mt-4">
                            <div className={`h-1 rounded-full ${healthData?.services?.redis === 'connected' ? 'bg-accent-rose' : 'bg-gray-700'} w-full transition-all duration-500`}></div>
                        </div>
                    </div>

                    {/* Environment Info */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-accent-amber/20 rounded-xl">
                                    <Server className="w-6 h-6 text-accent-amber" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Environment</h3>
                                    <p className="text-xs text-gray-400">Config</p>
                                </div>
                            </div>
                            {loading ? (
                                <div className="w-20 h-6 bg-white/10 animate-pulse rounded"></div>
                            ) : (
                                <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full">
                                    <span className="text-sm font-medium text-accent-amber capitalize">
                                        {healthData?.environment || 'Unknown'}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-400 flex justify-between">
                            <span>Last Updated:</span>
                            <span>{healthData?.timestamp ? new Date(healthData.timestamp).toLocaleTimeString() : '-'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
