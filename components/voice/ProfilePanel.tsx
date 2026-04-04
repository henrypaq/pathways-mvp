'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { PathwaysProfile } from '@/types/voice'
import { REQUIRED_PROFILE_FIELDS, PROFILE_FIELD_LABELS } from '@/types/voice'
import { getCountryLabel } from '@/lib/countries'

const COUNTRY_FIELDS = new Set<keyof PathwaysProfile>(['current_country', 'nationality', 'destination_country'])

/** Optional fields still stored on the profile but not shown in the live panel (too noisy or non-scalar). */
const PROFILE_PANEL_HIDDEN_OPTIONAL = new Set<keyof PathwaysProfile>(['language_test'])

function displayValue(field: keyof PathwaysProfile, value: string): string {
  if (COUNTRY_FIELDS.has(field) && /^[A-Z]{2}$/.test(value)) {
    return getCountryLabel(value)
  }
  return value
}

interface ProfilePanelProps {
  profile: Partial<PathwaysProfile>
  isComplete: boolean
}

export function ProfilePanel({ profile, isComplete }: ProfilePanelProps) {
  const filledRequired = REQUIRED_PROFILE_FIELDS.filter((f) => profile[f] !== undefined && profile[f] !== '')
  const progressPct = (filledRequired.length / REQUIRED_PROFILE_FIELDS.length) * 100

  const optionalKeys = (Object.keys(PROFILE_FIELD_LABELS) as (keyof PathwaysProfile)[]).filter(
    (k) => !REQUIRED_PROFILE_FIELDS.includes(k) && !PROFILE_PANEL_HIDDEN_OPTIONAL.has(k),
  )
  const filledOptional = optionalKeys.filter((k) => profile[k] !== undefined && profile[k] !== '')

  return (
    <div
      className="flex w-full max-w-[328px] min-w-[280px] flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      style={{ padding: '20px' }}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <p
          className="text-gray-500"
          style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}
        >
          Your Profile
        </p>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            className="bg-gray-100"
            style={{ flex: 1, height: '4px', borderRadius: '999px', overflow: 'hidden' }}
            role="progressbar"
            aria-valuenow={Math.round(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile completion"
          >
            <motion.div
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', background: '#534AB7', borderRadius: '999px' }}
            />
          </div>
          <span className="text-gray-500" style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>
            {filledRequired.length} / {REQUIRED_PROFILE_FIELDS.length}
          </span>
        </div>
      </div>

      {/* Completion banner */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="bg-green-50 text-green-700 border border-green-200"
            style={{ borderRadius: '8px', padding: '8px 12px', marginBottom: '16px', fontSize: '12px', fontWeight: 500 }}
          >
            Profile complete ✓
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable content */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {/* Required fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: filledOptional.length > 0 ? '16px' : '0' }}>
          {REQUIRED_PROFILE_FIELDS.map((field) => {
            const value = profile[field]
            const filled = value !== undefined && value !== ''
            return (
              <FieldRow
                key={field}
                label={PROFILE_FIELD_LABELS[field]}
                value={filled ? displayValue(field, String(value)) : null}
                required
              />
            )
          })}
        </div>

        {/* Divider + optional fields */}
        <AnimatePresence>
          {filledOptional.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <div className="border-gray-100" style={{ height: '1px', background: 'currentColor', marginBottom: '16px', opacity: 0.5 }} />
              <p
                className="text-gray-400"
                style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}
              >
                Additional details
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filledOptional.map((field) => (
                  <FieldRow key={field} label={PROFILE_FIELD_LABELS[field]} value={displayValue(field, String(profile[field]))} required={false} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

interface FieldRowProps {
  label: string
  value: string | null
  required: boolean
}

function FieldRow({ label, value, required }: FieldRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
      {/* Status dot */}
      <div
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          flexShrink: 0,
          marginTop: '5px',
          background: value ? '#1D9E75' : required ? '#E5E7EB' : '#534AB7',
          transition: 'background 0.3s ease',
        }}
      />

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          className="text-gray-500"
          style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, marginBottom: '2px' }}
        >
          {label}
        </div>

        <AnimatePresence mode="wait">
          {value ? (
            <motion.div
              key={value}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="text-gray-900"
              style={{ fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {value}
            </motion.div>
          ) : (
            <div key="empty" className="text-gray-300" style={{ fontSize: '12px' }}>
              —
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Checkmark for filled required fields */}
      <AnimatePresence>
        {value && required && (
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.25 }}
            style={{ fontSize: '11px', color: '#1D9E75', flexShrink: 0, marginTop: '3px' }}
          >
            ✓
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
