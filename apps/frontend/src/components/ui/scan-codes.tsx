'use client'

import { useState } from 'react'
import { Barcode, QrCode } from 'lucide-react'
import { ImageModal } from './image-modal'

interface ScanCodesProps {
    qrCode?: string
    barcode?: string
}

export function ScanCodes({ qrCode, barcode }: ScanCodesProps) {
    const [modalState, setModalState] = useState<{
        isOpen: boolean
        imageUrl: string
        title: string
        alt: string
    }>({
        isOpen: false,
        imageUrl: '',
        title: '',
        alt: '',
    })

    const openModal = (imageUrl: string, title: string, alt: string) => {
        // Only open modal if imageUrl is not empty
        if (imageUrl && imageUrl.trim() !== '') {
            setModalState({
                isOpen: true,
                imageUrl,
                title,
                alt,
            })
        }
    }

    const closeModal = () => {
        setModalState({
            isOpen: false,
            imageUrl: '',
            title: '',
            alt: '',
        })
    }

    if (!qrCode && !barcode) {
        return null
    }

    return (
        <>
            <div className='flex items-center gap-2'>
                {qrCode && qrCode.trim() !== '' && (
                    <button
                        type='button'
                        className='flex size-7 items-center justify-center rounded border border-border bg-background text-foreground hover:bg-muted transition-colors'
                        onClick={() => openModal(qrCode, 'QR Code', 'QR Code')}
                        aria-label='View QR Code'
                        title='View QR Code'
                    >
                        <QrCode className='size-4' />
                    </button>
                )}
                {barcode && barcode.trim() !== '' && (
                    <button
                        type='button'
                        className='flex size-7 items-center justify-center rounded border border-border bg-background text-foreground hover:bg-muted transition-colors'
                        onClick={() => openModal(barcode, 'Barcode', 'Barcode')}
                        aria-label='View Barcode'
                        title='View Barcode'
                    >
                        <Barcode className='size-4' />
                    </button>
                )}
            </div>
            <ImageModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                imageUrl={modalState.imageUrl}
                title={modalState.title}
                alt={modalState.alt}
            />
        </>
    )
}
