import { useState, useEffect } from 'react'
import axios from 'axios'

interface InstagramProfile {
  name: string
  profilePictureUrl?: string
  followersCount?: number
  followsCount?: number
  mediaCount?: number
}

interface InstagramAccount {
  id: string
  userId: string
  username: string
  accountId: string
  tokenType: string
  expiresAt?: string
  scopes: string[]
  profile?: InstagramProfile
  status: 'connected' | 'expired' | 'error'
  connectedAt: string
  lastRefreshed?: string
  error?: string
}

interface UseInstagramReturn {
  account: InstagramAccount | null
  connected: boolean
  loading: boolean
  error: string | null
  connectAccount: () => void
  disconnectAccount: () => Promise<void>
  refreshAccount: () => Promise<void>
}

export const useInstagram = (userId: string = 'default_user'): UseInstagramReturn => {
  const [account, setAccount] = useState<InstagramAccount | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch connected account
  const fetchAccount = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get(`/api/instagram/account?userId=${userId}`)
      
      if (response.data.success && response.data.connected) {
        setAccount(response.data.account)
        setConnected(true)
      } else {
        setAccount(null)
        setConnected(false)
      }
    } catch (err: any) {
      console.error('Error fetching Instagram account:', err)
      setError(err.response?.data?.error || 'Failed to fetch account')
      setAccount(null)
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }

  // Connect account (redirect to OAuth)
  const connectAccount = async () => {
    try {
      setError(null)
      const response = await axios.get(`/api/instagram/auth-url?userId=${userId}`)
      
      if (response.data.success && response.data.authUrl) {
        // Redirect to Instagram OAuth
        window.location.href = response.data.authUrl
      } else {
        throw new Error('Failed to get authorization URL')
      }
    } catch (err: any) {
      console.error('Error connecting Instagram:', err)
      setError(err.response?.data?.error || 'Failed to connect account')
    }
  }

  // Disconnect account
  const disconnectAccount = async () => {
    try {
      setError(null)
      const response = await axios.delete(`/api/instagram/account?userId=${userId}`)
      
      if (response.data.success) {
        setAccount(null)
        setConnected(false)
      }
    } catch (err: any) {
      console.error('Error disconnecting Instagram:', err)
      setError(err.response?.data?.error || 'Failed to disconnect account')
      throw err
    }
  }

  // Refresh account data
  const refreshAccount = async () => {
    try {
      setError(null)
      const response = await axios.post(`/api/instagram/account/refresh?userId=${userId}`)
      
      if (response.data.success) {
        setAccount(response.data.account)
      }
    } catch (err: any) {
      console.error('Error refreshing account:', err)
      setError(err.response?.data?.error || 'Failed to refresh account')
      throw err
    }
  }

  // Check for OAuth callback parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    const errorParam = params.get('error')
    const message = params.get('message')

    if (connected === 'true') {
      // Successfully connected, fetch account
      fetchAccount()
      // Clean up URL
      window.history.replaceState({}, '', '/settings')
    } else if (errorParam) {
      setError(decodeURIComponent(message || errorParam))
      // Clean up URL
      window.history.replaceState({}, '', '/settings')
    }
  }, [])

  // Fetch account on mount
  useEffect(() => {
    fetchAccount()
  }, [userId])

  return {
    account,
    connected,
    loading,
    error,
    connectAccount,
    disconnectAccount,
    refreshAccount
  }
}
