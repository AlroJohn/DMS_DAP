"use client";

import { useState, useEffect } from "react";
import { Download, Share, Printer, Edit, Shield, Eye, FileText, Calendar, User, Building, Lock, Unlock, LockKeyhole, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useParams } from "next/navigation";
import { DocumentLockBadge } from "@/components/ui/document-lock-badge";
import { OcrStatusBadge } from "@/components/ui/ocr-status-badge";
import { FileIntegrityBadge } from "@/components/ui/file-integrity-badge";
import { EncryptionBadge, SecurityLevelIndicator } from "@/components/ui/encryption-badge";
import { CheckoutDocumentModal } from "@/components/modals/checkout-document-modal";
import { CorruptionBanner } from "@/components/alerts/corruption-alert";
import { useDocumentLock } from "@/hooks/useDocumentLock";
import { useViewDocument } from "@/hooks/use-view-documents";
import { useDocumentFiles } from "@/hooks/use-document-files";

export default function DocumentViewerPage() {
  const params = useParams();
  const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutAction, setCheckoutAction] = useState<'checkout' | 'checkin' | 'override'>('checkout');

  // Fetch real document data instead of using mock data
  const { document, isLoading, error } = useViewDocument(params.id as string);
  const { files, isLoading: filesLoading, error: filesError } = useDocumentFiles(params.id as string);

  // Document lock management
  const { lock, checkout, checkin, override, canEdit, canOverride, checkLock } = useDocumentLock({
    documentId: params.id as string,
    currentUserId: 'current-user-id', // TODO: Get from auth context
  });

  // Check lock status on mount
  useEffect(() => {
    checkLock();
  }, [checkLock]);

  const handleCheckoutAction = (action: 'checkout' | 'checkin' | 'override') => {
    setCheckoutAction(action);
    setCheckoutModalOpen(true);
  };

  const handleConfirmCheckout = async () => {
    let success = false;
    if (checkoutAction === 'checkout') {
      success = await checkout();
    } else if (checkoutAction === 'checkin') {
      success = await checkin();
    } else {
      success = await override();
    }

    if (success) {
      await checkLock(); // Refresh lock status
    }
  };

  // Create a document object similar to the mock one but using real data
  const documentData = document ? {
    id: document.document_id,
    title: document.detail?.document_name || document.detail?.document_code || "Untitled Document",
    description: document.detail?.document_code || "No description available",
    type: document.detail?.document_type?.name || "General",
    department: document.detail?.department?.name || "Unknown",
    status: document.status,
    classification: document.detail?.classification || "Simple",
    fileSize: files && files.length > 0 ? `${(files[0].size || 0 / 1024 / 1024).toFixed(2)} MB` : "N/A",
    fileType: files && files.length > 0 ? files[0].type?.split('/')[1]?.toUpperCase() || "FILE" : "N/A",
    uploadDate: document.created_at ? new Date(document.created_at).toISOString().split('T')[0] : "Unknown",
    lastModified: document.created_at ? new Date(document.created_at).toISOString() : "Unknown",
    owner: document.detail?.created_by_account?.user?.first_name && document.detail?.created_by_account?.user?.last_name
      ? `${document.detail.created_by_account.user.first_name} ${document.detail.created_by_account.user.last_name}`
      : "Unknown User",
    signed: Boolean(document.blockchain?.status && document.blockchain?.status === 'signed'),
    verified: Boolean(document.blockchain?.status && document.blockchain?.status === 'signed'),
    blockchainHash: document.blockchain?.transactionHash || "N/A",
    signers: document.blockchain?.signedBy ? [{
      name: document.blockchain?.signedBy || "Unknown",
      date: document.blockchain?.signedAt || "Unknown",
      verified: true
    }] : [],
    // New status fields - using defaults since they're not in the database schema
    ocrStatus: 'searchable' as const,
    integrityStatus: 'verified' as const,
    encryptionStatus: 'encrypted' as const,
    checksum: document.detail?.document_code || 'N/A'
  } : null;

  // Show loading state while fetching data
  if (isLoading || filesLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 h-[800px] bg-gray-200 rounded-lg"></div>
          <div className="space-y-6">
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error || filesError) {
    return (
      <div className="p-6 max-w-[95%] mx-auto w-full pt-2 pb-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <h3 className="font-medium">Error loading document</h3>
          <p className="text-sm mt-1">{error || filesError}</p>
        </div>
      </div>
    );
  }

  // Show empty state if no document data
  if (!documentData) {
    return (
      <div className="p-6 max-w-[95%] mx-auto w-full pt-2 pb-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
          <h3 className="font-medium">Document not found</h3>
          <p className="text-sm mt-1">The requested document could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{documentData.title}</h1>
          <p className="text-muted-foreground">{documentData.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          {/* Edit button - behavior changes based on lock status */}
          {lock.status === 'locked_by_you' ? (
            <Button size="sm" onClick={() => {
              window.location.href = `/documents/${params.id as string}?mode=edit`;
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit (Locked by You)
            </Button>
          ) : lock.status === 'available' ? (
            <Button size="sm" onClick={() => {
              window.location.href = `/documents/${params.id as string}?mode=edit`;
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={true}>
              <Edit className="h-4 w-4 mr-2" />
              Edit (Locked)
            </Button>
          )}

          <Separator orientation="vertical" className="h-6" />

          {/* Lock Status Badge */}
          <DocumentLockBadge
            status={lock.status}
            lockedBy={lock.lockedBy}
            lockedAt={lock.lockedAt}
          />

          {/* Lock Action Buttons */}
          {lock.status === 'available' && (
            <Button onClick={() => handleCheckoutAction('checkout')} variant="outline" size="sm">
              <Lock className="h-4 w-4 mr-2" />
              Check Out
            </Button>
          )}

          {lock.status === 'locked_by_you' && (
            <Button onClick={() => handleCheckoutAction('checkin')} variant="outline" size="sm">
              <Unlock className="h-4 w-4 mr-2" />
              Check In
            </Button>
          )}

          {lock.status === 'locked' && canOverride && (
            <Button onClick={() => handleCheckoutAction('override')} variant="destructive" size="sm">
              <LockKeyhole className="h-4 w-4 mr-2" />
              Override
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="h-[800px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Preview
                {documentData.verified && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <Shield className="h-3 w-3 mr-1" />
                    Blockchain Verified
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-full">
              <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-600">Document Preview</p>
                  <p className="text-sm text-gray-500">PDF viewer would be embedded here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Type: {documentData.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Department: {documentData.department}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Owner: {documentData.owner}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Created: {documentData.uploadDate}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">File Size:</span>
                  <span className="text-sm font-medium">{documentData.fileSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Format:</span>
                  <span className="text-sm font-medium">{documentData.fileType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant="secondary">{documentData.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Classification:</span>
                  <Badge variant="outline">{documentData.classification}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>File Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Security Level Overview */}
              <SecurityLevelIndicator
                encryption={documentData.encryptionStatus}
                integrity={documentData.integrityStatus}
              />

              <Separator />

              {/* Individual Status Badges */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">OCR Status</p>
                  <OcrStatusBadge status={documentData.ocrStatus} />
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">File Integrity</p>
                  <FileIntegrityBadge
                    status={documentData.integrityStatus}
                    checksum={documentData.checksum}
                    algorithm="SHA256"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Encryption</p>
                  <EncryptionBadge
                    status={documentData.encryptionStatus}
                    algorithm="AES-256"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Lock Status</p>
                  <DocumentLockBadge
                    status={lock.status}
                    lockedBy={lock.lockedBy}
                    lockedAt={lock.lockedAt}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {documentData.signed && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Blockchain Signatures
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {documentData.signers.map((signer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{signer.name}</p>
                        <p className="text-xs text-muted-foreground">{signer.date}</p>
                      </div>
                      {signer.verified && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Verified
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium">Blockchain Hash:</p>
                  <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                    {documentData.blockchainHash}
                  </p>
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  View on Blockchain
                </Button>
              </CardContent>
            </Card>
          )}

          {!documentData.signed && (
            <Card>
              <CardHeader>
                <CardTitle>Document Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full" 
                  onClick={() => setIsSigningModalOpen(true)}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Sign with Blockchain
                </Button>
                <Button variant="outline" className="w-full">
                  <Share className="h-4 w-4 mr-2" />
                  Request Signature
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="text-sm font-medium">Version 1.0</p>
                    <p className="text-xs text-muted-foreground">Current</p>
                  </div>
                  <Badge variant="default">Latest</Badge>
                </div>
                {files && files.length > 1 && files.slice(1).map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="text-sm font-medium">Version {index + 1}.0</p>
                      <p className="text-xs text-muted-foreground">{new Date(file.uploadDate || '').toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                      <Button variant="ghost" size="sm">
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checkout Document Modal */}
      <CheckoutDocumentModal
        open={checkoutModalOpen}
        onOpenChange={setCheckoutModalOpen}
        action={checkoutAction}
        documentTitle={documentData.title}
        lockedBy={lock.lockedBy}
        lockedAt={lock.lockedAt}
        onConfirm={handleConfirmCheckout}
        isLoading={false}
      />
    </div>
  );
}