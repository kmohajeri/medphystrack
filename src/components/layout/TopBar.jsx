import { useAuth } from '../../context/AuthContext'

function initials(profile) {
  if (profile?.first_name && profile?.last_name)
    return (profile.first_name[0] + profile.last_name[0]).toUpperCase()
  return (profile?.email?.[0] ?? '?').toUpperCase()
}

function displayName(profile) {
  if (profile?.first_name)
    return [profile.first_name, profile.last_name].filter(Boolean).join(' ')
  return profile?.email ?? ''
}

function HamburgerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
  )
}

export default function TopBar({ onMenuClick }) {
  const { profile, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      {/* Left: hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
        aria-label="Open menu"
      >
        <HamburgerIcon />
      </button>

      {/* Spacer on desktop (sidebar handles the brand) */}
      <div className="hidden lg:block" />

      {/* Right: user + sign out */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
          {initials(profile)}
        </div>

        {/* Name / email — hidden on very small screens */}
        <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[180px] truncate">
          {displayName(profile)}
        </span>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <SignOutIcon />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}
