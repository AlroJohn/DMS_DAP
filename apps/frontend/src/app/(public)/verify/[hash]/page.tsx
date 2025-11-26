"use client";

import { useState } from "react";
import { Shield, CheckCircle, XCircle, Eye, Download, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useParams } from "next/navigation";

export default function PublicVerificationPage() {
  const params = useParams();
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [customHash, setCustomHash] = useState("");

  const mockVerificationData = {
    verified: true,
    documentTitle: "Annual Financial Report 2024",
    documentHash: params.hash,
    blockchainTxHash: "0xabcdef1234567890...",
    signedDate: "2024-01-22 14:30:25 UTC",
    signers: [
      {
        name: "John Smith",
        role: "CFO",
        signedAt: "2024-01-22 14:30:25 UTC",
        verified: true
      },
      {
        name: "Sarah Johnson", 
        role: "CEO",
        signedAt: "2024-01-22 15:45:10 UTC",
        verified: true
      }
    ],
    blockchainNetwork: "Ethereum Mainnet",
    certificateUrl: "/certificates/doc-123.pdf"
  };

  const handleVerify = async (hash?: string) => {
    setIsVerifying(true);
    // Simulate API call
    setTimeout(() => {
      setVerificationResult(mockVerificationData);
      setIsVerifying(false);
    }, 2000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Document Verification Portal</h1>
          <p className="text-muted-foreground mt-2">
            Verify the authenticity and integrity of blockchain-signed documents
          </p>
        </div>

        {!verificationResult && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Verify Document</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Document Hash</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter document hash or use URL parameter"
                    value={customHash || params.hash}
                    onChange={(e) => setCustomHash(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <Button 
                    onClick={() => handleVerify(customHash || params.hash as string)}
                    disabled={isVerifying}
                  >
                    {isVerifying ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This verification is performed against the blockchain and does not require login
              </p>
            </CardContent>
          </Card>
        )}

        {verificationResult && (
          <div className="space-y-6">
            <Card className={`border-2 ${
              verificationResult.verified 
                ? 'border-green-500 bg-green-50' 
                : 'border-red-500 bg-red-50'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  {verificationResult.verified ? (
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  ) : (
                    <XCircle className="h-12 w-12 text-red-600" />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold">
                      {verificationResult.verified ? 'Document Verified' : 'Verification Failed'}
                    </h2>
                    <p className={`text-lg ${
                      verificationResult.verified ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {verificationResult.verified 
                        ? 'This document is authentic and has not been tampered with'
                        : 'This document could not be verified or has been modified'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {verificationResult.verified && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Document Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Document Title</label>
                        <p className="font-medium">{verificationResult.documentTitle}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Signed Date</label>
                        <p className="font-medium">{verificationResult.signedDate}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Blockchain Network</label>
                        <p className="font-medium">{verificationResult.blockchainNetwork}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Total Signers</label>
                        <p className="font-medium">{verificationResult.signers.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Digital Signatures</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {verificationResult.signers.map((signer: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium">{signer.name}</p>
                              <p className="text-sm text-muted-foreground">{signer.role}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Verified
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {signer.signedAt}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Blockchain Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Document Hash</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 p-2 bg-gray-100 rounded text-xs font-mono break-all">
                            {verificationResult.documentHash}
                          </code>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(verificationResult.documentHash)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Transaction Hash</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 p-2 bg-gray-100 rounded text-xs font-mono break-all">
                            {verificationResult.blockchainTxHash}
                          </code>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(verificationResult.blockchainTxHash)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on Blockchain Explorer
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download Certificate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            <div className="text-center pt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setVerificationResult(null);
                  setCustomHash("");
                }}
              >
                Verify Another Document
              </Button>
            </div>
          </div>
        )}

        <div className="text-center mt-12 pt-8 border-t">
          <p className="text-sm text-muted-foreground">
            Powered by DocOnChain • Blockchain Document Verification
          </p>
        </div>
      </div>
    </div>
  );
}