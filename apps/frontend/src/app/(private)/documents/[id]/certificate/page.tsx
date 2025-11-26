"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Share2,
  Printer,
  FileText,
  Shield,
  Calendar,
  Hash,
  CheckCircle2,
  ArrowLeft,
  Mail,
} from "lucide-react";

export default function CertificatePage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise);
  const router = useRouter();

  const certificateData = {
    documentId: params.id,
    documentTitle: `Contract Agreement - ${params.id.slice(0, 8)}`,
    documentHash: `0x${Math.random().toString(36).substring(2, 15)}...`,
    transactionHash: `0x${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
    blockNumber: Math.floor(Math.random() * 1000000) + 15000000,
    timestamp: new Date().toISOString(),
    signerName: "John Doe",
    signerEmail: "john.doe@example.com",
    signerWallet: `0x${Math.random().toString(36).substring(2, 42)}`,
    network: "Ethereum Mainnet",
    certificateId: `CERT-${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
    issuedDate: new Date().toISOString(),
    verificationUrl: `https://verify.doconchain.com/${params.id}`,
  };

  const handleDownload = () => {
    // Mock download functionality
    alert("Certificate download would start here");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    navigator.share({
      title: "Blockchain Certificate",
      text: "Blockchain signature certificate for document",
      url: window.location.href,
    }).catch(() => {
      alert("Share functionality not supported on this browser");
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
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
              Blockchain Certificate
            </h1>
            <p className="text-muted-foreground">
              Official certificate of blockchain signature
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Certificate Document */}
      <Card className="border-2">
        <CardContent className="p-8 md:p-12">
          {/* Certificate Header */}
          <div className="text-center space-y-4 mb-8">
            <div className="flex justify-center">
              <Shield className="h-20 w-20 text-primary" />
            </div>
            <h2 className="text-4xl font-bold">Blockchain Signature Certificate</h2>
            <p className="text-lg text-muted-foreground">
              Official Certificate of Document Authentication
            </p>
            <Badge className="text-lg px-4 py-1">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Verified & Authenticated
            </Badge>
          </div>

          <Separator className="my-8" />

          {/* Certificate Body */}
          <div className="space-y-8">
            {/* Certificate Text */}
            <div className="text-center space-y-4">
              <p className="text-lg">This is to certify that the document</p>
              <h3 className="text-2xl font-bold">{certificateData.documentTitle}</h3>
              <p className="text-lg">
                has been digitally signed and permanently recorded on the blockchain
              </p>
            </div>

            <Separator />

            {/* Certificate Details */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground font-medium mb-1">
                    Certificate ID
                  </div>
                  <div className="font-mono text-sm">
                    {certificateData.certificateId}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground font-medium mb-1">
                    Document ID
                  </div>
                  <div className="font-mono text-sm">{certificateData.documentId}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground font-medium mb-1">
                    Document Hash
                  </div>
                  <div className="font-mono text-xs break-all">
                    {certificateData.documentHash}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground font-medium mb-1">
                    Network
                  </div>
                  <div>{certificateData.network}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground font-medium mb-1">
                    Signer Name
                  </div>
                  <div>{certificateData.signerName}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground font-medium mb-1">
                    Signer Email
                  </div>
                  <div className="text-sm">{certificateData.signerEmail}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground font-medium mb-1">
                    Signer Wallet
                  </div>
                  <div className="font-mono text-xs break-all">
                    {certificateData.signerWallet}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground font-medium mb-1">
                    Signature Date
                  </div>
                  <div>{new Date(certificateData.timestamp).toLocaleString()}</div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Blockchain Details */}
            <div className="bg-muted p-6 rounded-lg space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Blockchain Transaction Details
              </h4>
              <div className="grid gap-4">
                <div>
                  <div className="text-sm text-muted-foreground font-medium mb-1">
                    Transaction Hash
                  </div>
                  <div className="font-mono text-xs break-all">
                    {certificateData.transactionHash}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground font-medium mb-1">
                    Block Number
                  </div>
                  <div className="font-mono">
                    #{certificateData.blockNumber.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground font-medium mb-1">
                    Timestamp
                  </div>
                  <div>{new Date(certificateData.timestamp).toUTCString()}</div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Verification Information */}
            <div className="bg-blue-50 dark:bg-blue-950 p-6 rounded-lg space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Verification Information
              </h4>
              <p className="text-sm">
                This certificate can be independently verified using the following URL:
              </p>
              <div className="bg-white dark:bg-slate-900 p-3 rounded border">
                <code className="text-xs break-all">{certificateData.verificationUrl}</code>
              </div>
              <p className="text-xs text-muted-foreground">
                Scan the QR code on the signature confirmation page or visit the URL above to
                verify the authenticity of this certificate.
              </p>
            </div>

            <Separator />

            {/* Issuance Information */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Certificate Issued On</p>
              <p className="font-medium">
                {new Date(certificateData.issuedDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <div className="flex justify-center pt-4">
                <div className="text-center">
                  <div className="border-t-2 border-foreground pt-2 px-8">
                    <p className="font-semibold">DocOnChain</p>
                    <p className="text-sm text-muted-foreground">
                      Blockchain Document Signing Service
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information (Hidden on Print) */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>About This Certificate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            This blockchain certificate serves as cryptographic proof that the document was
            signed by the specified signer at the given timestamp. The signature is recorded
            on the blockchain and can be independently verified by anyone.
          </p>
          <p>
            The certificate includes the document hash, transaction hash, and other blockchain
            details that allow third parties to verify the authenticity without needing access
            to this system.
          </p>
          <p className="font-medium">
            This certificate is legally binding and accepted as proof of document authenticity
            in jurisdictions that recognize blockchain-based signatures.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
