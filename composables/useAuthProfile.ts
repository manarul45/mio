import type { Profile, UserRole } from '~/types/database.types'

export const useAuthProfile = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const profile = useState<Profile | null>('auth_profile', () => null)
  const loading = useState<boolean>('auth_profile_loading', () => false)

  const fetchProfile = async () => {
    // @nuxtjs/supabase v2 mengisi user dari isi token, ID ada di `sub`.
    const userId = user.value?.id || (user.value as any)?.sub
    if (!userId) {
      profile.value = null
      return null
    }

    loading.value = true
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error

      profile.value = data as Profile | null
      return profile.value
    } catch (err) {
      console.error('Error fetching profile:', err)
      profile.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  const hasRole = (roles: UserRole | UserRole[]) => {
    if (!profile.value) return false
    const allowed = Array.isArray(roles) ? roles : [roles]
    return allowed.includes(profile.value.role)
  }

  // user_metadata dan email bisa diatur sendiri oleh pengguna, jadi tidak dipakai untuk peran.
  const isAdmin = computed(() => {
    return profile.value?.role === 'ADMIN' ||
           profile.value?.role === 'SUPER_ADMIN' ||
           user.value?.app_metadata?.role === 'ADMIN' ||
           user.value?.app_metadata?.role === 'SUPER_ADMIN'
  })

  const isInstructor = computed(() => {
    return profile.value?.role === 'INSTRUCTOR' || isAdmin.value
  })

  const logout = async () => {
    await supabase.auth.signOut()
    profile.value = null
    navigateTo('/login')
  }

  // Watch for auth changes
  watch(user, async (newUser) => {
    if (newUser) {
      await fetchProfile()
    } else {
      profile.value = null
    }
  }, { immediate: true })

  return {
    user,
    profile,
    loading,
    fetchProfile,
    hasRole,
    isAdmin,
    isInstructor,
    logout
  }
}
