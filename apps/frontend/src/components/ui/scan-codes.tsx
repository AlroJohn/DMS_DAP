'use client'

import { useState } from 'react'
import { QrCode } from 'lucide-react'
import { ImageModal } from './image-modal'

interface ScanCodesProps {
    qrCode?: string
    barcode?: string
    documentCode?: string
}

export function ScanCodes({ qrCode, documentCode }: ScanCodesProps) {
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

    if (!qrCode) {
        return null
    }

    return (
        <>
            <div className='flex items-center gap-2'>
                {qrCode && qrCode.trim() !== '' && (
                    <button
                        type='button'
                        className='flex size-7 items-center justify-center rounded border border-border bg-background text-foreground hover:bg-muted transition-colors'
                        onClick={() =>
                            openModal(qrCode, documentCode || 'QR Code', 'QR Code')
                        }
                        aria-label='View QR Code'
                        title='View QR Code'
                    >
                        <QrCode className='size-4' />
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
