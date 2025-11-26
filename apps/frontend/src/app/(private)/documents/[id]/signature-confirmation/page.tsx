"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Download,
  Share2,
  Copy,
  FileText,
  Calendar,
  User,
  Hash,
  Clock,
  Shield,
  ArrowLeft,
  QrCode,
  ExternalLink,
} from "lucide-react";

export default function SignatureConfirmationPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise);
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const signatureData = {
    documentId: params.id,
    documentTitle: `Contract Agreement - ${params.id.slice(0, 8)}`,
    transactionHash: `0x${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
    blockNumber: Math.floor(Math.random() * 1000000) + 15000000,
    timestamp: new Date().toISOString(),
    signerName: "John Doe",
    signerEmail: "john.doe@example.com",
    network: "Ethereum Mainnet",
    gasUsed: "0.00123 ETH",
    certificateUrl: `/documents/${params.id}/certificate`,
    verificationUrl: `https://verify.doconchain.com/${params.id}`,
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://verify.doconchain.com/${params.id}`,
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/documents/${params.id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Signature Confirmed
            </h1>
            <p className="text-muted-foreground">
              Document successfully signed on blockchain
            </p>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-green-500 p-3">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-green-900 dark:text-green-100">
                Document Successfully Signed
              </CardTitle>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Your document has been securely signed and recorded on the blockchain.
                This signature is cryptographically verifiable and immutable.
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Document Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Document Title</div>
              <div className="font-medium">{signatureData.documentTitle}</div>
            </div>
            <Separator />
            <div>
              <div className="text-sm text-muted-foreground">Document ID</div>
              <div className="font-mono text-sm">{signatureData.documentId}</div>
            </div>
            <Separator />
            <div>
              <div className="text-sm text-muted-foreground">Signed By</div>
              <div className="space-y-1">
                <div className="font-medium">{signatureData.signerName}</div>
                <div className="text-sm text-muted-foreground">
                  {signatureData.signerEmail}
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <div className="text-sm text-muted-foreground">Signed At</div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{new Date(signatureData.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Blockchain Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Blockchain Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Network</div>
              <Badge variant="outline" className="mt-1">
                {signatureData.network}
              </Badge>
            </div>
            <Separator />
            <div>
              <div className="text-sm text-muted-foreground mb-2">Transaction Hash</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-2 py-1 text-xs break-all">
                  {signatureData.transactionHash}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(signatureData.transactionHash)}
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Separator />
            <div>
              <div className="text-sm text-muted-foreground">Block Number</div>
              <div className="font-mono text-sm">
                #{signatureData.blockNumber.toLocaleString()}
              </div>
            </div>
            <Separator />
            <div>
              <div className="text-sm text-muted-foreground">Gas Used</div>
              <div className="font-mono text-sm">{signatureData.gasUsed}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verification QR Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Verification QR Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="bg-white p-4 rounded-lg border">
              <img
                src={signatureData.qrCodeUrl}
                alt="Verification QR Code"
                className="h-48 w-48"
              />
            </div>
            <div className="flex-1 space-y-3">
              <p className="text-sm text-muted-foreground">
                Scan this QR code to verify the document's blockchain signature from any device.
                The verification is public and does not require authentication.
              </p>
              <div className="space-y-2">
                <div className="text-sm font-medium">Verification URL:</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 text-xs">
                    {signatureData.verificationUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(signatureData.verificationUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(signatureData.verificationUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={() => router.push(signatureData.certificateUrl)}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Blockchain Certificate (PDF)
          </Button>
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={() => router.push(`/documents/${params.id}/blockchain`)}
          >
            <Hash className="mr-2 h-4 w-4" />
            View Transaction on Blockchain Explorer
          </Button>
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={() => router.push(`/documents/${params.id}/signature-history`)}
          >
            <Clock className="mr-2 h-4 w-4" />
            View Signature History
          </Button>
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={() => {
              copyToClipboard(signatureData.verificationUrl);
            }}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share Verification Link
          </Button>
        </CardContent>
      </Card>

      {/* Important Information */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Important Information
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <p>
            • This signature is permanently recorded on the blockchain and cannot be altered or removed.
          </p>
          <p>
            • The certificate and verification link can be shared with third parties for independent verification.
          </p>
          <p>
            • Any modifications to the document after signing will invalidate the signature.
          </p>
          <p>
            • Keep a copy of the blockchain certificate for your records.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
