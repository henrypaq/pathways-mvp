'use client'

import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

interface DateOfBirthPickerProps {
  value: string   // ISO date string "YYYY-MM-DD" or empty
  onChange: (value: string) => void
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 105 }, (_, i) => CURRENT_YEAR - i)

export function DateOfBirthPicker({ value, onChange }: DateOfBirthPickerProps) {
  const selected = value ? new Date(value + 'T12:00:00') : null

  return (
    <div className="relative w-full">
      <DatePicker
        selected={selected}
        onChange={(date: Date | null) => {
          if (!date) { onChange(''); return }
          const y = date.getFullYear()
          const m = String(date.getMonth() + 1).padStart(2, '0')
          const d = String(date.getDate()).padStart(2, '0')
          onChange(`${y}-${m}-${d}`)
        }}
        dateFormat="MMMM d, yyyy"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        maxDate={new Date()}
        minDate={new Date('1920-01-01')}
        placeholderText="Select your date of birth"
        yearDropdownItemNumber={100}
        scrollableYearDropdown
        className="dob-input w-full rounded-lg border border-[#E5E5E5] bg-[#F9F9F9] px-3 py-2 text-sm text-[#171717] placeholder-gray-300 outline-none transition-all duration-150 focus:border-[#534AB7] focus:bg-white focus:ring-2 focus:ring-[#534AB7]/10 cursor-pointer"
        wrapperClassName="w-full"
        renderCustomHeader={({
          date,
          changeYear,
          changeMonth,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <div className="flex items-center justify-between px-2 py-1 gap-2">
            <button
              onClick={decreaseMonth}
              disabled={prevMonthButtonDisabled}
              type="button"
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-600 transition-colors text-lg leading-none"
            >
              ‹
            </button>
            <div className="flex gap-1">
              <select
                value={date.getMonth()}
                onChange={(e) => changeMonth(Number(e.target.value))}
                className="text-sm border-0 bg-transparent font-medium text-gray-700 cursor-pointer focus:outline-none"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={date.getFullYear()}
                onChange={(e) => changeYear(Number(e.target.value))}
                className="text-sm border-0 bg-transparent font-medium text-gray-700 cursor-pointer focus:outline-none"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              onClick={increaseMonth}
              disabled={nextMonthButtonDisabled}
              type="button"
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-600 transition-colors text-lg leading-none"
            >
              ›
            </button>
          </div>
        )}
      />
    </div>
  )
}
