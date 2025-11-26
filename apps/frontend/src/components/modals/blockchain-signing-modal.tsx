"use client";

import { useState } from "react";
import { Shield, CheckCircle, AlertCircle, Loader2, Key, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useSignDocument, SignDocumentResponse } from "@/hooks/use-sign-document";
import { toast } from "sonner";

interface BlockchainSigningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    id: string;
    title: string;
    hash?: string;
    blockchainStatus?: string | null;
  };
  onSigned?: (result: SignDocumentResponse) => void;
}

export function BlockchainSigningModal({ open, onOpenChange, document, onSigned }: BlockchainSigningModalProps) {
  const [step, setStep] = useState(1);
  const [signingProgress, setSigningProgress] = useState(0);
  const [signature, setSignature] = useState("");
  const [comments, setComments] = useState("");
  const { signDocument, isLoading, error, data, reset: resetSignDocument } = useSignDocument();

  const handleSign = async () => {
    setStep(2);
    setSigningProgress(20);

    try {
      // Progress: Preparing request
      await new Promise(resolve => setTimeout(resolve, 500));
      setSigningProgress(40);

      // Call the actual API
      const result = await signDocument(document.id, signature);

      setSigningProgress(60);
      await new Promise(resolve => setTimeout(resolve, 500));
      setSigningProgress(80);

      if (result) {
        setSigningProgress(100);
        await new Promise(resolve => setTimeout(resolve, 500));
        setStep(3);

        toast.success("Document signed successfully and recorded on the blockchain.");
        if (result.redirectUrl) {
          window.open(result.redirectUrl, '_blank', 'noopener,noreferrer');
        }
        onSigned?.(result);
      } else {
        // Error handled by the hook
        setStep(1);
        setSigningProgress(0);
        toast.error(error || "Failed to sign document. Please try again.");
      }
    } catch (err: any) {
      console.error('Error in handleSign:', err);
      setStep(1);
      setSigningProgress(0);
      toast.error(err.message || "An unexpected error occurred.");
    }
  };

  const resetModal = () => {
    setStep(1);
    setSigningProgress(0);
    setSignature("");
    setComments("");
    resetSignDocument();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetModal();
    }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Blockchain Document Signing
          </DialogTitle>
          <DialogDescription>
            Initiate DocOnChain signing. We will open a new tab if DocOnChain requires further action.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Document Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{document.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Hash:</span>
                  <span className="text-sm font-mono break-all bg-muted px-2 py-1 rounded-md">{document.hash || "Will be generated upon signing"}</span>
                </div>
                {document.blockchainStatus && (
                  <div className="flex items-center gap-2">
                    <Badge variant={document.blockchainStatus === "signed" ? "default" : "secondary"}>
                      {document.blockchainStatus.toUpperCase()}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signature">Digital Signature</Label>
                <Input
                  id="signature"
                  placeholder="Enter your full name as digital signature"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">Comments (Optional)</Label>
                <Textarea
                  id="comments"
                  placeholder="Add any comments about this signature..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-1">
                <Shield className="h-4 w-4" /> What happens when you sign:
              </h4>
              <ul className="text-sm space-y-1">
                <li><span className="font-medium">Document Integrity:</span> A unique cryptographic hash of your document is generated and securely recorded on the blockchain.</li>
                <li><span className="font-medium">Immutable Timestamp:</span> An unalterable timestamp is created, proving the existence of your document at a specific point in time.</li>
                <li><span className="font-medium">Digital Certificate:</span> A digital certificate linking your signature to the document and its blockchain record is generated.</li>
                <li><span className="font-medium">Tamper Evidence:</span> The document becomes tamper-evident; any future modifications will invalidate its blockchain record.</li>
              </ul>
            </div>



            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSign}
                disabled={!signature.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Sign Document
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-2">Processing Your Blockchain Signature</h3>
              <p className="text-muted-foreground">This may take a few moments. Please keep this window open.</p>
            </div>

            <div className="space-y-2">
              <Progress value={signingProgress} className="w-full h-2" />
              <p className="text-sm text-muted-foreground">
                {signingProgress <= 20 && "Step 1/4: Generating document hash..."}
                {signingProgress > 20 && signingProgress <= 40 && "Step 2/4: Connecting to DocOnChain API..."}
                {signingProgress > 40 && signingProgress <= 60 && "Step 3/4: Creating blockchain transaction..."}
                {signingProgress > 60 && signingProgress <= 80 && "Step 4/4: Waiting for network confirmation..."}
                {signingProgress > 80 && "Finalizing signature details..."}
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">
                Important: Do not close this window or navigate away while your signature is being processed.
              </p>
            </div>
          </div>
        )}

        {step === 3 && data && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-green-900">Document Successfully Signed & Recorded!</h3>
              <p className="text-muted-foreground">Your document has been securely signed and permanently recorded on the blockchain.</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Signature Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Transaction Hash</label>
                    <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all mt-1">
                      {data.transactionHash}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Project UUID</label>
                    <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all mt-1">
                      {data.projectUuid}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <Badge variant={data.status === 'signed' ? 'default' : 'secondary'}>
                        {data.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                    <p className="font-medium mt-1">{new Date().toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">
                Your document is now tamper-evident and its authenticity is verifiable on the blockchain.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              {data.redirectUrl && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (data.redirectUrl) {
                      window.open(data.redirectUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on DocOnChain
                </Button>
              )}
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}