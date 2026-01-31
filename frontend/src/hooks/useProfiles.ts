import { useState, useEffect, useCallback } from 'react'
import { 
  getProfiles, 
  createProfile, 
  deleteProfile, 
  refreshProfile 
} from '../services/api'
import type { Profile } from '../types'

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfiles = useCallback(async (filters?: { 
    status?: string
    tag?: string
    search?: string 
  }) => {
    try {
      setLoading(true)
      setError(null)
      const data = await getProfiles(filters)
      setProfiles(data.profiles)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch profiles')
      console.error('Profiles error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const addProfile = async (username: string, tags?: string[]) => {
    try {
      const newProfile = await createProfile({ username, tags })
      setProfiles(prev => [newProfile, ...prev])
      return newProfile
    } catch (err: any) {
      throw new Error(err.response?.data?.error?.message || 'Failed to add profile')
    }
  }

  const removeProfile = async (id: string) => {
    try {
      await deleteProfile(id)
      setProfiles(prev => prev.filter(p => p.id !== id))
    } catch (err: any) {
      throw new Error(err.response?.data?.error?.message || 'Failed to delete profile')
    }
  }

  const refresh = async (id: string) => {
    try {
      await refreshProfile(id)
      await fetchProfiles()
    } catch (err: any) {
      throw new Error(err.response?.data?.error?.message || 'Failed to refresh profile')
    }
  }

  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  return { 
    profiles, 
    loading, 
    error, 
    addProfile, 
    removeProfile, 
    refresh,
    refetch: fetchProfiles 
  }
}
