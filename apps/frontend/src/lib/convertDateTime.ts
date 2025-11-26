type ConvertDateTimeOptions = {
    dateOnly?: boolean
}

export const convertDateTime = (
    isoString: string,
    options: ConvertDateTimeOptions = {}
) => {
    if (!isoString) return ''

    const date = new Date(isoString)
    const baseOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }

    if (options.dateOnly) {
        return date.toLocaleDateString('en-PH', baseOptions)
    }

    return date.toLocaleString('en-PH', {
        ...baseOptions,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    })
}
