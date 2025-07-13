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

interface CartItem {
  name: string
  price: number
  quantity: number
}

interface Member {
  id: string
  name: string
  membershipType: string
  discount: number
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
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [memberLookup, setMemberLookup] = useState('')
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
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
          role: 'cashier' // Default role
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

  const addToCart = (name: string, price: number) => {
    setCartItems([...cartItems, { name, price, quantity: 1 }])
  }

  const removeFromCart = (index: number) => {
    setCartItems(cartItems.filter((item, i) => i !== index))
  }

  const clearCart = () => {
    setCartItems([])
  }

  const getCartTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  const processPayment = async () => {
    try {
      // Process payment logic here
      toast({
        title: "Payment processed successfully!",
        description: "Your order has been completed.",
      })
      clearCart()
    } catch (error) {
      console.error('Error processing payment:', error)
    }
  }

  const lookupMember = async () => {
    try {
      // Lookup member logic here
      const member = await blink.db.members.list({
        where: { id: memberLookup }
      })
      if (member.length > 0) {
        setSelectedMember(member[0])
      } else {
        setSelectedMember(null)
      }
    } catch (error) {
      console.error('Error looking up member:', error)
    }
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
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-white">Billing System</h1>
              <div className="text-gray-400">
                Real-time billing and payment processing
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Drink Shortcuts */}
              <div className="lg:col-span-2 space-y-6">
                {/* Cover Charges */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-400" />
                      Cover Charges
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Button 
                        onClick={() => addToCart('General Entry', 25)}
                        className="bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 h-16 flex flex-col"
                      >
                        <span className="font-medium">General Entry</span>
                        <span className="text-sm">$25.00</span>
                      </Button>
                      <Button 
                        onClick={() => addToCart('VIP Entry', 50)}
                        className="bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 h-16 flex flex-col"
                      >
                        <span className="font-medium">VIP Entry</span>
                        <span className="text-sm">$50.00</span>
                      </Button>
                      <Button 
                        onClick={() => addToCart('Student Entry', 15)}
                        className="bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 h-16 flex flex-col"
                      >
                        <span className="font-medium">Student Entry</span>
                        <span className="text-sm">$15.00</span>
                      </Button>
                      <Button 
                        onClick={() => addToCart('Group Entry (5+)', 20)}
                        className="bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 h-16 flex flex-col"
                      >
                        <span className="font-medium">Group Entry</span>
                        <span className="text-sm">$20.00</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Premium Drinks */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Music className="h-5 w-5 text-purple-400" />
                      Premium Drinks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Button 
                        onClick={() => addToCart('Grey Goose Shot', 18)}
                        className="bg-gray-700/50 border border-gray-600 text-gray-300 hover:bg-gray-600/50 h-16 flex flex-col"
                      >
                        <span className="font-medium">Grey Goose</span>
                        <span className="text-sm">$18.00</span>
                      </Button>
                      <Button 
                        onClick={() => addToCart('Hennessy Shot', 22)}
                        className="bg-amber-600/20 border border-amber-500/30 text-amber-400 hover:bg-amber-600/30 h-16 flex flex-col"
                      >
                        <span className="font-medium">Hennessy</span>
                        <span className="text-sm">$22.00</span>
                      </Button>
                      <Button 
                        onClick={() => addToCart('Dom Pérignon', 350)}
                        className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 h-16 flex flex-col"
                      >
                        <span className="font-medium">Dom Pérignon</span>
                        <span className="text-sm">$350.00</span>
                      </Button>
                      <Button 
                        onClick={() => addToCart('Macallan 18', 45)}
                        className="bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:bg-orange-500/30 h-16 flex flex-col"
                      >
                        <span className="font-medium">Macallan 18</span>
                        <span className="text-sm">$45.00</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Regular Drinks */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-400" />
                      Regular Drinks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Button 
                        onClick={() => addToCart('Beer (Domestic)', 8)}
                        className="bg-yellow-600/20 border border-yellow-600/30 text-yellow-400 hover:bg-yellow-600/30 h-16 flex flex-col"
                      >
                        <span className="font-medium">Beer</span>
                        <span className="text-sm">$8.00</span>
                      </Button>
                      <Button 
                        onClick={() => addToCart('Vodka Tonic', 12)}
                        className="bg-blue-600/20 border border-blue-600/30 text-blue-400 hover:bg-blue-600/30 h-16 flex flex-col"
                      >
                        <span className="font-medium">Vodka Tonic</span>
                        <span className="text-sm">$12.00</span>
                      </Button>
                      <Button 
                        onClick={() => addToCart('Rum & Coke', 10)}
                        className="bg-red-600/20 border border-red-600/30 text-red-400 hover:bg-red-600/30 h-16 flex flex-col"
                      >
                        <span className="font-medium">Rum & Coke</span>
                        <span className="text-sm">$10.00</span>
                      </Button>
                      <Button 
                        onClick={() => addToCart('Whiskey Sour', 14)}
                        className="bg-amber-700/20 border border-amber-700/30 text-amber-400 hover:bg-amber-700/30 h-16 flex flex-col"
                      >
                        <span className="font-medium">Whiskey Sour</span>
                        <span className="text-sm">$14.00</span>
                      </Button>
                      <Button 
                        onClick={() => addToCart('Margarita', 13)}
                        className="bg-lime-600/20 border border-lime-600/30 text-lime-400 hover:bg-lime-600/30 h-16 flex flex-col"
                      >
                        <span className="font-medium">Margarita</span>
                        <span className="text-sm">$13.00</span>
                      </Button>
                      <Button 
                        onClick={() => addToCart('Cosmopolitan', 15)}
                        className="bg-pink-600/20 border border-pink-600/30 text-pink-400 hover:bg-pink-600/30 h-16 flex flex-col"
                      >
                        <span className="font-medium">Cosmopolitan</span>
                        <span className="text-sm">$15.00</span>
                      </Button>
                      <Button 
                        onClick={() => addToCart('Long Island', 16)}
                        className="bg-indigo-600/20 border border-indigo-600/30 text-indigo-400 hover:bg-indigo-600/30 h-16 flex flex-col"
                      >
                        <span className="font-medium">Long Island</span>
                        <span className="text-sm">$16.00</span>
                      </Button>
                      <Button 
                        onClick={() => addToCart('Mojito', 12)}
                        className="bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 hover:bg-emerald-600/30 h-16 flex flex-col"
                      >
                        <span className="font-medium">Mojito</span>
                        <span className="text-sm">$12.00</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Non-Alcoholic */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Clock className="h-5 w-5 text-green-400" />
                      Non-Alcoholic
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Button 
                        onClick={() => addToCart('Soft Drink', 5)}
                        className="bg-green-600/20 border border-green-600/30 text-green-400 hover:bg-green-600/30 h-16 flex flex-col"
                      >
                        <span className="font-medium">Soft Drink</span>
                        <span className="text-sm">$5.00</span>
                      </Button>
                      <Button 
                        onClick={() => addToCart('Energy Drink', 7)}
                        className="bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 h-16 flex flex-col"
                      >
                        <span className="font-medium">Energy Drink</span>
                        <span className="text-sm">$7.00</span>
                      </Button>
                      <Button 
                        onClick={() => addToCart('Bottled Water', 3)}
                        className="bg-cyan-600/20 border border-cyan-600/30 text-cyan-400 hover:bg-cyan-600/30 h-16 flex flex-col"
                      >
                        <span className="font-medium">Water</span>
                        <span className="text-sm">$3.00</span>
                      </Button>
                      <Button 
                        onClick={() => addToCart('Fresh Juice', 6)}
                        className="bg-orange-600/20 border border-orange-600/30 text-orange-400 hover:bg-orange-600/30 h-16 flex flex-col"
                      >
                        <span className="font-medium">Fresh Juice</span>
                        <span className="text-sm">$6.00</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Cart & Checkout */}
              <div className="space-y-6">
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <span>Current Order</span>
                      <Badge className="bg-purple-500/20 text-purple-400">
                        {cartItems.length} items
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cartItems.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">No items in cart</p>
                    ) : (
                      <>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {cartItems.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                              <div className="flex-1">
                                <p className="text-white font-medium">{item.name}</p>
                                <p className="text-gray-400 text-sm">Qty: {item.quantity}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-white font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                                <Button
                                  onClick={() => removeFromCart(index)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                                >
                                  ×
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="border-t border-gray-700 pt-4">
                          <div className="flex justify-between text-lg font-bold text-white">
                            <span>Total:</span>
                            <span>${getCartTotal().toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Button 
                            onClick={processPayment}
                            className="w-full bg-green-500 hover:bg-green-600 text-white"
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Process Payment
                          </Button>
                          <Button 
                            onClick={clearCart}
                            variant="outline"
                            className="w-full border-gray-600 text-gray-400 hover:bg-gray-800"
                          >
                            Clear Cart
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Member Lookup */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Member Discount</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Enter member ID or phone"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400"
                        value={memberLookup}
                        onChange={(e) => setMemberLookup(e.target.value)}
                      />
                      <Button 
                        onClick={lookupMember}
                        className="w-full bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30"
                      >
                        Apply Member Discount
                      </Button>
                      {selectedMember && (
                        <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                          <p className="text-green-400 font-medium">{selectedMember.name}</p>
                          <p className="text-green-300 text-sm">{selectedMember.membershipType} - {selectedMember.discount}% off</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="text-white">
            <h1 className="text-3xl font-bold mb-6">Member Management</h1>
            <p className="text-gray-400">Member management features coming soon...</p>
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