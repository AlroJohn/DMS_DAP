'use client'

import { useState } from 'react'
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
                    <img
                        src={qrCode}
                        alt='QR Code'
                        className='size-6 cursor-pointer hover:opacity-80 transition-opacity'
                        style={{
                            imageRendering: 'crisp-edges'
                        }}
                        onClick={() => openModal(qrCode, 'QR Code', 'QR Code')}
                    />
                )}
                {barcode && barcode.trim() !== '' && (
                    <img
                        src={barcode}
                        alt='Barcode'
                        className='h-6 w-12 object-contain cursor-pointer hover:opacity-80 transition-opacity'
                        style={{
                            imageRendering: 'crisp-edges'
                        }}
                        onClick={() => openModal(barcode, 'Barcode', 'Barcode')}
                    />
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
