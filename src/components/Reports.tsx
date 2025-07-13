import { useState, useEffect } from 'react'
import { blink } from '../blink/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { useToast } from '../hooks/use-toast'
import { 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Calendar,
  Download,
  RefreshCw,
  Filter,
  Eye,
  FileText,
  CreditCard
} from 'lucide-react'

interface Transaction {
  id: string
  memberName: string
  membershipType: string
  items: string
  originalAmount: number
  discountAmount: number
  finalAmount: number
  paymentMethod: string
  transactionDate: string
  cashierName: string
  isRefund: number
  refundReason?: string
}

interface Member {
  id: string
  name: string
  email: string
  phone: string
  membershipType: string
  joinDate: string
  lastVisit: string
  totalSpent: number
  visitCount: number
}

interface DailyReport {
  date: string
  totalSales: number
  totalRefunds: number
  netRevenue: number
  transactionCount: number
  memberCheckIns: number
  topItems: Array<{ item: string; quantity: number; revenue: number }>
  paymentMethods: Array<{ method: string; amount: number; count: number }>
}

interface ReportsProps {
  user: any
}

export default function Reports({ user }: ReportsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  })
  const [filterMemberType, setFilterMemberType] = useState('all')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all')
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const { toast } = useToast()

  // Summary stats
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRefunds: 0,
    netRevenue: 0,
    totalTransactions: 0,
    averageTransaction: 0,
    topMembershipType: '',
    topPaymentMethod: ''
  })

  useEffect(() => {
    loadReportsData()
  }, [dateRange, filterMemberType, filterPaymentMethod])

  const loadReportsData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadTransactions(),
        loadMembers(),
        loadDailyReports()
      ])
      calculateStats()
    } catch (error) {
      console.error('Error loading reports data:', error)
      toast({
        title: "Error loading reports",
        description: "Failed to load reports data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTransactions = async () => {
    try {
      const allTransactions = await blink.db.transactions.list({
        where: {
          userId: user.id,
          transactionDate: {
            gte: dateRange.startDate,
            lte: dateRange.endDate + 'T23:59:59'
          }
        },
        orderBy: { transactionDate: 'desc' }
      })

      // Apply filters
      let filteredTransactions = allTransactions
      
      if (filterMemberType !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.membershipType === filterMemberType)
      }
      
      if (filterPaymentMethod !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.paymentMethod === filterPaymentMethod)
      }

      setTransactions(filteredTransactions)
    } catch (error) {
      console.error('Error loading transactions:', error)
    }
  }

  const loadMembers = async () => {
    try {
      const allMembers = await blink.db.members.list({
        where: { userId: user.id },
        orderBy: { totalSpent: 'desc' }
      })
      setMembers(allMembers)
    } catch (error) {
      console.error('Error loading members:', error)
    }
  }

  const loadDailyReports = async () => {
    try {
      // Generate daily reports for the date range
      const reports: DailyReport[] = []
      const startDate = new Date(dateRange.startDate)
      const endDate = new Date(dateRange.endDate)
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        
        // Get transactions for this day
        const dayTransactions = await blink.db.transactions.list({
          where: {
            userId: user.id,
            transactionDate: {
              gte: dateStr,
              lte: dateStr + 'T23:59:59'
            }
          }
        })

        // Get check-ins for this day
        const dayCheckIns = await blink.db.checkIns.list({
          where: {
            userId: user.id,
            checkInTime: {
              gte: dateStr,
              lte: dateStr + 'T23:59:59'
            }
          }
        })

        const sales = dayTransactions.filter(t => Number(t.isRefund) === 0)
        const refunds = dayTransactions.filter(t => Number(t.isRefund) === 1)
        
        const totalSales = sales.reduce((sum, t) => sum + Number(t.finalAmount), 0)
        const totalRefunds = refunds.reduce((sum, t) => sum + Number(t.finalAmount), 0)

        // Analyze top items
        const itemCounts: { [key: string]: { quantity: number; revenue: number } } = {}
        sales.forEach(t => {
          const items = JSON.parse(t.items || '[]')
          items.forEach((item: any) => {
            if (!itemCounts[item.name]) {
              itemCounts[item.name] = { quantity: 0, revenue: 0 }
            }
            itemCounts[item.name].quantity += item.quantity
            itemCounts[item.name].revenue += item.price * item.quantity
          })
        })

        const topItems = Object.entries(itemCounts)
          .map(([item, data]) => ({ item, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)

        // Analyze payment methods
        const paymentCounts: { [key: string]: { amount: number; count: number } } = {}
        dayTransactions.forEach(t => {
          if (!paymentCounts[t.paymentMethod]) {
            paymentCounts[t.paymentMethod] = { amount: 0, count: 0 }
          }
          paymentCounts[t.paymentMethod].amount += Number(t.finalAmount)
          paymentCounts[t.paymentMethod].count += 1
        })

        const paymentMethods = Object.entries(paymentCounts)
          .map(([method, data]) => ({ method, ...data }))
          .sort((a, b) => b.amount - a.amount)

        reports.push({
          date: dateStr,
          totalSales,
          totalRefunds,
          netRevenue: totalSales - totalRefunds,
          transactionCount: dayTransactions.length,
          memberCheckIns: dayCheckIns.length,
          topItems,
          paymentMethods
        })
      }

      setDailyReports(reports.reverse()) // Most recent first
    } catch (error) {
      console.error('Error loading daily reports:', error)
    }
  }

  const calculateStats = () => {
    const sales = transactions.filter(t => Number(t.isRefund) === 0)
    const refunds = transactions.filter(t => Number(t.isRefund) === 1)
    
    const totalSales = sales.reduce((sum, t) => sum + Number(t.finalAmount), 0)
    const totalRefunds = refunds.reduce((sum, t) => sum + Number(t.finalAmount), 0)
    const netRevenue = totalSales - totalRefunds
    
    // Find top membership type
    const membershipCounts: { [key: string]: number } = {}
    transactions.forEach(t => {
      membershipCounts[t.membershipType] = (membershipCounts[t.membershipType] || 0) + Number(t.finalAmount)
    })
    const topMembershipType = Object.entries(membershipCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'

    // Find top payment method
    const paymentCounts: { [key: string]: number } = {}
    transactions.forEach(t => {
      paymentCounts[t.paymentMethod] = (paymentCounts[t.paymentMethod] || 0) + Number(t.finalAmount)
    })
    const topPaymentMethod = Object.entries(paymentCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'

    setStats({
      totalSales,
      totalRefunds,
      netRevenue,
      totalTransactions: transactions.length,
      averageTransaction: transactions.length > 0 ? netRevenue / transactions.length : 0,
      topMembershipType,
      topPaymentMethod
    })
  }

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: "No data to export",
        description: "There is no data available for the selected filters.",
        variant: "destructive"
      })
      return
    }

    const headers = Object.keys(data[0]).join(',')
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    ).join('\n')
    
    const csv = `${headers}\n${rows}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${dateRange.startDate}_to_${dateRange.endDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Export successful",
      description: `${filename} has been downloaded as CSV.`,
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Reports & Analytics</h1>
        <div className="flex items-center gap-3">
          <Button
            onClick={loadReportsData}
            disabled={loading}
            variant="outline"
            className="border-gray-600 text-gray-400 hover:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Filter className="h-5 w-5 text-purple-400" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Start Date</label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">End Date</label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Membership Type</label>
              <Select value={filterMemberType} onValueChange={setFilterMemberType}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Bronze">Bronze</SelectItem>
                  <SelectItem value="Silver">Silver</SelectItem>
                  <SelectItem value="Gold">Gold</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="Guest">Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Payment Method</label>
              <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{formatCurrency(stats.totalSales)}</div>
            <p className="text-xs text-gray-500">{transactions.filter(t => Number(t.isRefund) === 0).length} transactions</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Refunds</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{formatCurrency(stats.totalRefunds)}</div>
            <p className="text-xs text-gray-500">{transactions.filter(t => Number(t.isRefund) === 1).length} refunds</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Net Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.netRevenue)}</div>
            <p className="text-xs text-gray-500">After refunds</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Avg Transaction</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{formatCurrency(stats.averageTransaction)}</div>
            <p className="text-xs text-gray-500">{stats.totalTransactions} total transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports Tabs */}
      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList className="bg-gray-900/50 border border-gray-800">
          <TabsTrigger value="transactions" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
            All Transactions
          </TabsTrigger>
          <TabsTrigger value="sales" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
            Sales Only
          </TabsTrigger>
          <TabsTrigger value="refunds" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
            Refunds Only
          </TabsTrigger>
          <TabsTrigger value="members" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
            Member Details
          </TabsTrigger>
          <TabsTrigger value="daily" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            Daily Reports
          </TabsTrigger>
        </TabsList>

        {/* All Transactions */}
        <TabsContent value="transactions">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">All Transactions</CardTitle>
                  <CardDescription className="text-gray-400">
                    Complete transaction history including sales and refunds
                  </CardDescription>
                </div>
                <Button
                  onClick={() => exportToCSV(transactions, 'all_transactions')}
                  className="bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-400 pb-3">Date</th>
                      <th className="text-left text-gray-400 pb-3">Member</th>
                      <th className="text-left text-gray-400 pb-3">Type</th>
                      <th className="text-left text-gray-400 pb-3">Items</th>
                      <th className="text-right text-gray-400 pb-3">Amount</th>
                      <th className="text-left text-gray-400 pb-3">Payment</th>
                      <th className="text-left text-gray-400 pb-3">Cashier</th>
                      <th className="text-left text-gray-400 pb-3">Status</th>
                      <th className="text-left text-gray-400 pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-gray-800">
                        <td className="py-3 text-gray-300">{formatDate(transaction.transactionDate)}</td>
                        <td className="py-3">
                          <div>
                            <p className="text-white font-medium">{transaction.memberName}</p>
                            <Badge className={`text-xs ${
                              transaction.membershipType === 'VIP' ? 'bg-purple-500/20 text-purple-400' :
                              transaction.membershipType === 'Gold' ? 'bg-yellow-500/20 text-yellow-400' :
                              transaction.membershipType === 'Silver' ? 'bg-gray-500/20 text-gray-400' :
                              transaction.membershipType === 'Bronze' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {transaction.membershipType}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3">
                          <Badge className={Number(transaction.isRefund) === 1 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
                            {Number(transaction.isRefund) === 1 ? 'Refund' : 'Sale'}
                          </Badge>
                        </td>
                        <td className="py-3 text-gray-300 max-w-32 truncate">
                          {JSON.parse(transaction.items || '[]').map((item: any) => item.name).join(', ')}
                        </td>
                        <td className="py-3 text-right">
                          <div>
                            <p className="text-white font-medium">{formatCurrency(Number(transaction.finalAmount))}</p>
                            {Number(transaction.discountAmount) > 0 && (
                              <p className="text-xs text-green-400">-{formatCurrency(Number(transaction.discountAmount))} discount</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <Badge className="bg-blue-500/20 text-blue-400 capitalize">
                            {transaction.paymentMethod}
                          </Badge>
                        </td>
                        <td className="py-3 text-gray-300">{transaction.cashierName}</td>
                        <td className="py-3">
                          {Number(transaction.isRefund) === 1 && transaction.refundReason && (
                            <p className="text-xs text-red-400">{transaction.refundReason}</p>
                          )}
                        </td>
                        <td className="py-3">
                          <Button
                            onClick={() => setSelectedTransaction(transaction)}
                            size="sm"
                            variant="ghost"
                            className="text-purple-400 hover:text-purple-300"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transactions.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    No transactions found for the selected filters.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Only */}
        <TabsContent value="sales">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Sales Transactions</CardTitle>
                  <CardDescription className="text-gray-400">
                    All successful sales transactions (excluding refunds)
                  </CardDescription>
                </div>
                <Button
                  onClick={() => exportToCSV(transactions.filter(t => Number(t.isRefund) === 0), 'sales_transactions')}
                  className="bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Sales CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-400 pb-3">Date</th>
                      <th className="text-left text-gray-400 pb-3">Member</th>
                      <th className="text-left text-gray-400 pb-3">Items</th>
                      <th className="text-right text-gray-400 pb-3">Original</th>
                      <th className="text-right text-gray-400 pb-3">Discount</th>
                      <th className="text-right text-gray-400 pb-3">Final</th>
                      <th className="text-left text-gray-400 pb-3">Payment</th>
                      <th className="text-left text-gray-400 pb-3">Cashier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.filter(t => Number(t.isRefund) === 0).map((transaction) => (
                      <tr key={transaction.id} className="border-b border-gray-800">
                        <td className="py-3 text-gray-300">{formatDate(transaction.transactionDate)}</td>
                        <td className="py-3">
                          <div>
                            <p className="text-white font-medium">{transaction.memberName}</p>
                            <Badge className={`text-xs ${
                              transaction.membershipType === 'VIP' ? 'bg-purple-500/20 text-purple-400' :
                              transaction.membershipType === 'Gold' ? 'bg-yellow-500/20 text-yellow-400' :
                              transaction.membershipType === 'Silver' ? 'bg-gray-500/20 text-gray-400' :
                              transaction.membershipType === 'Bronze' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {transaction.membershipType}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 text-gray-300 max-w-32 truncate">
                          {JSON.parse(transaction.items || '[]').map((item: any) => `${item.name} (${item.quantity})`).join(', ')}
                        </td>
                        <td className="py-3 text-right text-gray-300">{formatCurrency(Number(transaction.originalAmount))}</td>
                        <td className="py-3 text-right text-green-400">
                          {Number(transaction.discountAmount) > 0 ? `-${formatCurrency(Number(transaction.discountAmount))}` : '-'}
                        </td>
                        <td className="py-3 text-right text-white font-medium">{formatCurrency(Number(transaction.finalAmount))}</td>
                        <td className="py-3">
                          <Badge className="bg-blue-500/20 text-blue-400 capitalize">
                            {transaction.paymentMethod}
                          </Badge>
                        </td>
                        <td className="py-3 text-gray-300">{transaction.cashierName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transactions.filter(t => Number(t.isRefund) === 0).length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    No sales transactions found for the selected filters.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Refunds Only */}
        <TabsContent value="refunds">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Refund Transactions</CardTitle>
                  <CardDescription className="text-gray-400">
                    All refund transactions with reasons
                  </CardDescription>
                </div>
                <Button
                  onClick={() => exportToCSV(transactions.filter(t => Number(t.isRefund) === 1), 'refund_transactions')}
                  className="bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Refunds CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-400 pb-3">Date</th>
                      <th className="text-left text-gray-400 pb-3">Member</th>
                      <th className="text-left text-gray-400 pb-3">Items</th>
                      <th className="text-right text-gray-400 pb-3">Refund Amount</th>
                      <th className="text-left text-gray-400 pb-3">Reason</th>
                      <th className="text-left text-gray-400 pb-3">Payment Method</th>
                      <th className="text-left text-gray-400 pb-3">Processed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.filter(t => Number(t.isRefund) === 1).map((transaction) => (
                      <tr key={transaction.id} className="border-b border-gray-800">
                        <td className="py-3 text-gray-300">{formatDate(transaction.transactionDate)}</td>
                        <td className="py-3">
                          <div>
                            <p className="text-white font-medium">{transaction.memberName}</p>
                            <Badge className={`text-xs ${
                              transaction.membershipType === 'VIP' ? 'bg-purple-500/20 text-purple-400' :
                              transaction.membershipType === 'Gold' ? 'bg-yellow-500/20 text-yellow-400' :
                              transaction.membershipType === 'Silver' ? 'bg-gray-500/20 text-gray-400' :
                              transaction.membershipType === 'Bronze' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {transaction.membershipType}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 text-gray-300 max-w-32 truncate">
                          {JSON.parse(transaction.items || '[]').map((item: any) => item.name).join(', ')}
                        </td>
                        <td className="py-3 text-right text-red-400 font-medium">{formatCurrency(Number(transaction.finalAmount))}</td>
                        <td className="py-3 text-gray-300">{transaction.refundReason || 'No reason provided'}</td>
                        <td className="py-3">
                          <Badge className="bg-blue-500/20 text-blue-400 capitalize">
                            {transaction.paymentMethod}
                          </Badge>
                        </td>
                        <td className="py-3 text-gray-300">{transaction.cashierName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transactions.filter(t => Number(t.isRefund) === 1).length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    No refund transactions found for the selected filters.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Member Details */}
        <TabsContent value="members">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Member Details Report</CardTitle>
                  <CardDescription className="text-gray-400">
                    Complete member information with spending and visit history
                  </CardDescription>
                </div>
                <Button
                  onClick={() => exportToCSV(members, 'member_details')}
                  className="bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Members CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-400 pb-3">Name</th>
                      <th className="text-left text-gray-400 pb-3">Contact</th>
                      <th className="text-left text-gray-400 pb-3">Membership</th>
                      <th className="text-left text-gray-400 pb-3">Join Date</th>
                      <th className="text-left text-gray-400 pb-3">Last Visit</th>
                      <th className="text-right text-gray-400 pb-3">Total Spent</th>
                      <th className="text-right text-gray-400 pb-3">Visit Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-b border-gray-800">
                        <td className="py-3 text-white font-medium">{member.name}</td>
                        <td className="py-3">
                          <div className="text-gray-300">
                            <p>{member.email}</p>
                            <p className="text-xs text-gray-400">{member.phone}</p>
                          </div>
                        </td>
                        <td className="py-3">
                          <Badge className={`${
                            member.membershipType === 'VIP' ? 'bg-purple-500/20 text-purple-400' :
                            member.membershipType === 'Gold' ? 'bg-yellow-500/20 text-yellow-400' :
                            member.membershipType === 'Silver' ? 'bg-gray-500/20 text-gray-400' :
                            member.membershipType === 'Bronze' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {member.membershipType}
                          </Badge>
                        </td>
                        <td className="py-3 text-gray-300">{formatDate(member.joinDate)}</td>
                        <td className="py-3 text-gray-300">{member.lastVisit ? formatDate(member.lastVisit) : 'Never'}</td>
                        <td className="py-3 text-right text-white font-medium">{formatCurrency(Number(member.totalSpent))}</td>
                        <td className="py-3 text-right text-gray-300">{member.visitCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {members.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    No members found.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Reports */}
        <TabsContent value="daily">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Daily Reports</CardTitle>
                  <CardDescription className="text-gray-400">
                    Comprehensive daily breakdown of all activities
                  </CardDescription>
                </div>
                <Button
                  onClick={() => exportToCSV(dailyReports, 'daily_reports')}
                  className="bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Daily CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {dailyReports.map((report) => (
                  <div key={report.date} className="border border-gray-700 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-white">{formatDate(report.date)}</h3>
                      <div className="flex items-center gap-4">
                        <Badge className="bg-green-500/20 text-green-400">
                          {formatCurrency(report.totalSales)} Sales
                        </Badge>
                        {report.totalRefunds > 0 && (
                          <Badge className="bg-red-500/20 text-red-400">
                            {formatCurrency(report.totalRefunds)} Refunds
                          </Badge>
                        )}
                        <Badge className="bg-purple-500/20 text-purple-400">
                          {formatCurrency(report.netRevenue)} Net
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="h-4 w-4 text-blue-400" />
                          <span className="text-sm text-gray-400">Transactions</span>
                        </div>
                        <p className="text-lg font-bold text-white">{report.transactionCount}</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-green-400" />
                          <span className="text-sm text-gray-400">Check-ins</span>
                        </div>
                        <p className="text-lg font-bold text-white">{report.memberCheckIns}</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-purple-400" />
                          <span className="text-sm text-gray-400">Avg Transaction</span>
                        </div>
                        <p className="text-lg font-bold text-white">
                          {report.transactionCount > 0 ? formatCurrency(report.netRevenue / report.transactionCount) : '$0.00'}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart3 className="h-4 w-4 text-amber-400" />
                          <span className="text-sm text-gray-400">Revenue/Check-in</span>
                        </div>
                        <p className="text-lg font-bold text-white">
                          {report.memberCheckIns > 0 ? formatCurrency(report.netRevenue / report.memberCheckIns) : '$0.00'}
                        </p>
                      </div>
                    </div>

                    {report.topItems.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-400 mb-3">Top Items</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {report.topItems.slice(0, 6).map((item, index) => (
                            <div key={index} className="bg-gray-800/30 rounded-lg p-3">
                              <p className="text-white font-medium">{item.item}</p>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Qty: {item.quantity}</span>
                                <span className="text-green-400">{formatCurrency(item.revenue)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {report.paymentMethods.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-3">Payment Methods</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {report.paymentMethods.map((method, index) => (
                            <div key={index} className="bg-gray-800/30 rounded-lg p-3">
                              <p className="text-white font-medium capitalize">{method.method}</p>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-400">{method.count} transactions</span>
                                <span className="text-blue-400">{formatCurrency(method.amount)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {dailyReports.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    No daily reports available for the selected date range.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Transaction Details</h3>
              <Button
                onClick={() => setSelectedTransaction(null)}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                ×
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Transaction ID</label>
                  <p className="text-white font-mono">{selectedTransaction.id}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Date & Time</label>
                  <p className="text-white">{new Date(selectedTransaction.transactionDate).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Member</label>
                  <p className="text-white">{selectedTransaction.memberName}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Membership Type</label>
                  <Badge className={`${
                    selectedTransaction.membershipType === 'VIP' ? 'bg-purple-500/20 text-purple-400' :
                    selectedTransaction.membershipType === 'Gold' ? 'bg-yellow-500/20 text-yellow-400' :
                    selectedTransaction.membershipType === 'Silver' ? 'bg-gray-500/20 text-gray-400' :
                    selectedTransaction.membershipType === 'Bronze' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {selectedTransaction.membershipType}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400">Items Purchased</label>
                <div className="mt-2 space-y-2">
                  {JSON.parse(selectedTransaction.items || '[]').map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center bg-gray-800/50 rounded-lg p-3">
                      <span className="text-white">{item.name}</span>
                      <div className="text-right">
                        <p className="text-white">Qty: {item.quantity}</p>
                        <p className="text-gray-400">{formatCurrency(item.price)} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Original Amount</label>
                  <p className="text-white font-medium">{formatCurrency(Number(selectedTransaction.originalAmount))}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Discount</label>
                  <p className="text-green-400 font-medium">-{formatCurrency(Number(selectedTransaction.discountAmount))}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Final Amount</label>
                  <p className="text-white font-bold text-lg">{formatCurrency(Number(selectedTransaction.finalAmount))}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Payment Method</label>
                  <Badge className="bg-blue-500/20 text-blue-400 capitalize">
                    {selectedTransaction.paymentMethod}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Processed By</label>
                  <p className="text-white">{selectedTransaction.cashierName}</p>
                </div>
              </div>

              {Number(selectedTransaction.isRefund) === 1 && (
                <div>
                  <label className="text-sm text-gray-400">Refund Reason</label>
                  <p className="text-red-400">{selectedTransaction.refundReason || 'No reason provided'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}