import { useState, useEffect } from 'react'
import { blink } from '../blink/client'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { useToast } from '../hooks/use-toast'
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  BarChart3, 
  UserCheck, 
  Settings,
  LogOut,
  Music,
  TrendingUp,
  DollarSign,
  Clock
} from 'lucide-react'

interface User {
  id: string
  email: string
  name?: string
  role?: string
}

interface DashboardProps {
  user: User
}

export default function Dashboard({ user }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [userProfile, setUserProfile] = useState<any>(null)
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    todayRevenue: 0,
    monthlyRevenue: 0
  })
  const { toast } = useToast()

  useEffect(() => {
    initializeUser()
    loadDashboardStats()
  }, [user])

  const initializeUser = async () => {
    try {
      // Check if user exists in our database
      const existingUsers = await blink.db.users.list({
        where: { email: user.email }
      })

      if (existingUsers.length === 0) {
        // Create new user profile
        const newUser = await blink.db.users.create({
          id: user.id,
          email: user.email,
          name: user.name || user.email.split('@')[0],
          role: 'cashier', // Default role
          userId: user.id
        })
        setUserProfile(newUser)
        
        toast({
          title: "Welcome to Onish Nightclub!",
          description: "Your account has been set up. Contact admin to update your role.",
        })
      } else {
        setUserProfile(existingUsers[0])
      }
    } catch (error) {
      console.error('Error initializing user:', error)
    }
  }

  const loadDashboardStats = async () => {
    try {
      // Get total members
      const members = await blink.db.members.list({
        where: { userId: user.id }
      })
      
      // Get active members (checked in today)
      const today = new Date().toISOString().split('T')[0]
      const checkIns = await blink.db.checkIns.list({
        where: { 
          userId: user.id,
          checkInTime: { gte: today }
        }
      })

      // Get today's revenue
      const todayTransactions = await blink.db.transactions.list({
        where: {
          userId: user.id,
          transactionDate: { gte: today }
        }
      })

      const todayRevenue = todayTransactions.reduce((sum, t) => sum + Number(t.finalAmount), 0)

      // Get monthly revenue
      const monthStart = new Date()
      monthStart.setDate(1)
      const monthlyTransactions = await blink.db.transactions.list({
        where: {
          userId: user.id,
          transactionDate: { gte: monthStart.toISOString() }
        }
      })

      const monthlyRevenue = monthlyTransactions.reduce((sum, t) => sum + Number(t.finalAmount), 0)

      setStats({
        totalMembers: members.length,
        activeMembers: checkIns.length,
        todayRevenue,
        monthlyRevenue
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleLogout = () => {
    blink.auth.logout()
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500'
      case 'manager': return 'bg-blue-500'
      case 'cashier': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const canAccess = (requiredRole: string) => {
    const roleHierarchy = { admin: 3, manager: 2, cashier: 1 }
    const userRoleLevel = roleHierarchy[userProfile?.role as keyof typeof roleHierarchy] || 0
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0
    return userRoleLevel >= requiredLevel
  }

  return (
    <div className="min-h-screen bg-[#0F0F23] flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900/50 border-r border-gray-800 p-4">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-amber-500 rounded-lg flex items-center justify-center">
            <Music className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold">Onish</h1>
            <p className="text-gray-400 text-xs">Nightclub System</p>
          </div>
        </div>

        {/* User Info */}
        <div className="mb-6 p-3 bg-gray-800/50 rounded-lg">
          <p className="text-white font-medium">{userProfile?.name || user.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`${getRoleColor(userProfile?.role)} text-white text-xs`}>
              {userProfile?.role || 'Loading...'}
            </Badge>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
              activeTab === 'dashboard' 
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
              activeTab === 'members' 
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <Users className="h-5 w-5" />
            Members
          </button>

          <button
            onClick={() => setActiveTab('billing')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
              activeTab === 'billing' 
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <CreditCard className="h-5 w-5" />
            Billing
          </button>

          <button
            onClick={() => setActiveTab('checkin')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
              activeTab === 'checkin' 
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <UserCheck className="h-5 w-5" />
            Check-in/out
          </button>

          {canAccess('manager') && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                activeTab === 'reports' 
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              Reports
            </button>
          )}

          {canAccess('admin') && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                activeTab === 'settings' 
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Settings className="h-5 w-5" />
              Settings
            </button>
          )}
        </nav>

        {/* Logout */}
        <div className="mt-auto pt-6">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800/50"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
              <div className="text-gray-400">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Total Members</CardTitle>
                  <Users className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.totalMembers}</div>
                  <p className="text-xs text-gray-500">Registered members</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Active Today</CardTitle>
                  <Clock className="h-4 w-4 text-amber-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.activeMembers}</div>
                  <p className="text-xs text-gray-500">Checked in today</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Today's Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">${stats.todayRevenue.toFixed(2)}</div>
                  <p className="text-xs text-gray-500">Daily earnings</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Monthly Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">${stats.monthlyRevenue.toFixed(2)}</div>
                  <p className="text-xs text-gray-500">This month</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
                <CardDescription className="text-gray-400">
                  Common tasks for nightclub operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={() => setActiveTab('members')}
                    className="bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Add New Member
                  </Button>
                  <Button 
                    onClick={() => setActiveTab('checkin')}
                    className="bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Member Check-in
                  </Button>
                  <Button 
                    onClick={() => setActiveTab('billing')}
                    className="bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Process Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="text-white">
            <h1 className="text-3xl font-bold mb-6">Member Management</h1>
            <p className="text-gray-400">Member management features coming soon...</p>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="text-white">
            <h1 className="text-3xl font-bold mb-6">Billing System</h1>
            <p className="text-gray-400">Billing features coming soon...</p>
          </div>
        )}

        {activeTab === 'checkin' && (
          <div className="text-white">
            <h1 className="text-3xl font-bold mb-6">Member Check-in/out</h1>
            <p className="text-gray-400">Check-in features coming soon...</p>
          </div>
        )}

        {activeTab === 'reports' && canAccess('manager') && (
          <div className="text-white">
            <h1 className="text-3xl font-bold mb-6">Reports & Analytics</h1>
            <p className="text-gray-400">Reports features coming soon...</p>
          </div>
        )}

        {activeTab === 'settings' && canAccess('admin') && (
          <div className="text-white">
            <h1 className="text-3xl font-bold mb-6">System Settings</h1>
            <p className="text-gray-400">Settings features coming soon...</p>
          </div>
        )}
      </div>
    </div>
  )
}