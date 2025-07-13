import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { blink } from '../blink/client'
import { useToast } from '../hooks/use-toast'
import { Music, Users, BarChart3 } from 'lucide-react'

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'cashier'
  })
  const { toast } = useToast()

  const handleLogin = () => {
    blink.auth.login()
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // First login to get authenticated
      blink.auth.login()
      
      // After login, we'll create the user profile in the database
      // This will be handled in the Dashboard component when user first logs in
    } catch (error) {
      toast({
        title: "Registration Error",
        description: "Failed to register user. Please try again.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0F23] via-[#1a1a3a] to-[#0F0F23] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-amber-500 rounded-full mb-4">
            <Music className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Onish Nightclub</h1>
          <p className="text-gray-400">Management System</p>
        </div>

        <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-white">
              {isRegistering ? 'Create Staff Account' : 'Staff Login'}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {isRegistering 
                ? 'Register as a new staff member' 
                : 'Access the nightclub management system'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isRegistering ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-300">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-gray-300">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="cashier">Cashier/Staff</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-amber-500 hover:from-purple-600 hover:to-amber-600">
                  Register & Login
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <Button onClick={handleLogin} className="w-full bg-gradient-to-r from-purple-500 to-amber-500 hover:from-purple-600 hover:to-amber-600">
                  Login with Blink
                </Button>
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-purple-400 hover:text-purple-300 text-sm"
              >
                {isRegistering 
                  ? 'Already have an account? Login' 
                  : 'New staff member? Register here'
                }
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="text-gray-400">
            <Users className="h-6 w-6 mx-auto mb-2 text-purple-400" />
            <p className="text-xs">Member Management</p>
          </div>
          <div className="text-gray-400">
            <Music className="h-6 w-6 mx-auto mb-2 text-amber-400" />
            <p className="text-xs">Real-time Billing</p>
          </div>
          <div className="text-gray-400">
            <BarChart3 className="h-6 w-6 mx-auto mb-2 text-purple-400" />
            <p className="text-xs">Analytics & Reports</p>
          </div>
        </div>
      </div>
    </div>
  )
}