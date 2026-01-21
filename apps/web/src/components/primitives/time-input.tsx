import React, { useEffect, useRef } from 'react'

interface TimeInputProps {
    value?: Date
    onChange: (hours: number, minutes: number) => void
}

interface TimeParts {
    hours: number
    minutes: number
}

const TimeInput: React.FC<TimeInputProps> = ({ value, onChange }) => {
    const [time, setTime] = React.useState<TimeParts>(() => {
        const d = value ? new Date(value) : new Date()
        return {
            hours: d.getHours(),
            minutes: d.getMinutes()
        }
    })

    const hoursRef = useRef<HTMLInputElement | null>(null)
    const minutesRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => {
        const d = value ? new Date(value) : new Date()
        setTime({
            hours: d.getHours(),
            minutes: d.getMinutes()
        })
    }, [value])

    const validateTime = (field: keyof TimeParts, value: number): boolean => {
        if (field === 'hours' && (value < 0 || value > 23)) {
            return false
        }
        if (field === 'minutes' && (value < 0 || value > 59)) {
            return false
        }
        return true
    }

    const handleInputChange =
        (field: keyof TimeParts) => (e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = e.target.value ? Number(e.target.value) : 0
            const isValid = validateTime(field, newValue)

            const newTime = { ...time, [field]: newValue }
            setTime(newTime)

            if (isValid) {
                onChange(newTime.hours, newTime.minutes)
            }
        }

    const initialTime = useRef<TimeParts>(time)

    const handleBlur = (field: keyof TimeParts) => (
        e: React.FocusEvent<HTMLInputElement>
    ): void => {
        const newValue = e.target.value ? Number(e.target.value) : 0
        const isValid = validateTime(field, newValue)

        if (!isValid) {
            setTime(initialTime.current)
        } else {
            initialTime.current = { ...time, [field]: newValue }
        }
    }

    const handleKeyDown =
        (field: keyof TimeParts) => (e: React.KeyboardEvent<HTMLInputElement>) => {
            // Allow command (or control) combinations
            if (e.metaKey || e.ctrlKey) {
                return
            }

            // Prevent non-numeric characters, excluding allowed keys
            if (
                !/^[0-9]$/.test(e.key) &&
                ![
                    'ArrowUp',
                    'ArrowDown',
                    'ArrowLeft',
                    'ArrowRight',
                    'Delete',
                    'Tab',
                    'Backspace',
                    'Enter'
                ].includes(e.key)
            ) {
                e.preventDefault()
                return
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault()
                let newTime = { ...time }

                if (field === 'hours') {
                    newTime.hours = (time.hours + 1) % 24
                }

                if (field === 'minutes') {
                    if (time.minutes === 59) {
                        newTime.minutes = 0
                        newTime.hours = (time.hours + 1) % 24
                    } else {
                        newTime.minutes += 1
                    }
                }

                setTime(newTime)
                onChange(newTime.hours, newTime.minutes)
            } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                let newTime = { ...time }

                if (field === 'hours') {
                    newTime.hours = time.hours === 0 ? 23 : time.hours - 1
                }

                if (field === 'minutes') {
                    if (time.minutes === 0) {
                        newTime.minutes = 59
                        newTime.hours = time.hours === 0 ? 23 : time.hours - 1
                    } else {
                        newTime.minutes -= 1
                    }
                }

                setTime(newTime)
                onChange(newTime.hours, newTime.minutes)
            }

            if (e.key === 'ArrowRight') {
                if (
                    e.currentTarget.selectionStart === e.currentTarget.value.length ||
                    (e.currentTarget.selectionStart === 0 &&
                        e.currentTarget.selectionEnd === e.currentTarget.value.length)
                ) {
                    e.preventDefault()
                    if (field === 'hours') minutesRef.current?.focus()
                }
            } else if (e.key === 'ArrowLeft') {
                if (
                    e.currentTarget.selectionStart === 0 ||
                    (e.currentTarget.selectionStart === 0 &&
                        e.currentTarget.selectionEnd === e.currentTarget.value.length)
                ) {
                    e.preventDefault()
                    if (field === 'minutes') hoursRef.current?.focus()
                }
            }
        }

    const formatValue = (value: number): string => {
        return value.toString().padStart(2, '0')
    }

    return (
        <div className="flex border rounded-lg items-center text-sm px-1">
            <input
                type="text"
                ref={hoursRef}
                max={23}
                maxLength={2}
                value={formatValue(time.hours)}
                onChange={handleInputChange('hours')}
                onKeyDown={handleKeyDown('hours')}
                onFocus={(e) => {
                    if (window.innerWidth > 1024) {
                        e.target.select()
                    }
                }}
                onBlur={handleBlur('hours')}
                className="p-0 outline-none w-6 border-none text-center"
                placeholder="HH"
            />
            <span className="opacity-20 -mx-px">:</span>
            <input
                type="text"
                ref={minutesRef}
                max={59}
                maxLength={2}
                value={formatValue(time.minutes)}
                onChange={handleInputChange('minutes')}
                onKeyDown={handleKeyDown('minutes')}
                onFocus={(e) => {
                    if (window.innerWidth > 1024) {
                        e.target.select()
                    }
                }}
                onBlur={handleBlur('minutes')}
                className="p-0 outline-none w-6 border-none text-center"
                placeholder="MM"
            />
        </div>
    )
}

TimeInput.displayName = 'TimeInput'

export { TimeInput }
