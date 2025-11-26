"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  CheckCircle2,
  Hash,
  Blocks,
  Clock,
  Zap,
  Shield,
  FileText,
  User,
  AlertCircle,
} from "lucide-react";

export default function BlockchainViewerPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise);
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);

  const blockchainData = {
    documentId: params.id,
    documentTitle: `Contract Agreement - ${params.id.slice(0, 8)}`,
    transactionHash: `0x${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
    blockHash: `0x${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
    blockNumber: Math.floor(Math.random() * 1000000) + 15000000,
    timestamp: new Date().toISOString(),
    from: `0x${Math.random().toString(36).substring(2, 42)}`,
    to: `0x${Math.random().toString(36).substring(2, 42)}`,
    value: "0 ETH",
    gasUsed: "21000",
    gasPrice: "50 Gwei",
    transactionFee: "0.00105 ETH",
    nonce: Math.floor(Math.random() * 1000),
    confirmations: Math.floor(Math.random() * 1000) + 12,
    status: "Success",
    network: "Ethereum Mainnet",
    explorerUrl: "https://etherscan.io/tx/",
  };

  const inputData = {
    function: "signDocument",
    documentHash: `0x${Math.random().toString(36).substring(2, 15)}`,
    signerAddress: blockchainData.from,
    timestamp: Math.floor(Date.now() / 1000),
  };

  const events = [
    {
      name: "DocumentSigned",
      args: {
        documentId: params.id,
        signer: blockchainData.from,
        timestamp: new Date(blockchainData.timestamp).getTime(),
        documentHash: inputData.documentHash,
      },
    },
  ];

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
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
              Blockchain Transaction
            </h1>
            <p className="text-muted-foreground">
              View transaction details on blockchain explorer
            </p>
          </div>
        </div>
        <Button
          onClick={() =>
            window.open(
              `${blockchainData.explorerUrl}${blockchainData.transactionHash}`,
              "_blank"
            )
          }
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          View on Etherscan
        </Button>
      </div>

      {/* Status Card */}
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div>
                <CardTitle className="text-green-900 dark:text-green-100">
                  Transaction Successful
                </CardTitle>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  {blockchainData.confirmations} Confirmations
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-green-600 text-green-600">
              <Shield className="mr-1 h-3 w-3" />
              Verified
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Main Transaction Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Transaction Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground mb-2">Transaction Hash</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-xs break-all">
                {blockchainData.transactionHash}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(blockchainData.transactionHash, "txhash")}
              >
                {copied === "txhash" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Status</div>
              <Badge className="bg-green-500">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {blockchainData.status}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Block</div>
              <div className="font-mono text-sm">
                #{blockchainData.blockNumber.toLocaleString()}
              </div>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Timestamp</div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {new Date(blockchainData.timestamp).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Confirmations</div>
              <div className="flex items-center gap-2 text-sm">
                <Blocks className="h-4 w-4 text-muted-foreground" />
                {blockchainData.confirmations} blocks
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for More Details */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="input">Input Data</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="gas">Gas Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transaction Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-2">From</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 text-xs">
                    {blockchainData.from}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(blockchainData.from, "from")}
                  >
                    {copied === "from" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <Separator />
              <div>
                <div className="text-sm text-muted-foreground mb-2">To (Smart Contract)</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 text-xs">
                    {blockchainData.to}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(blockchainData.to, "to")}
                  >
                    {copied === "to" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Value</div>
                  <div className="font-mono text-sm">{blockchainData.value}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Network</div>
                  <div className="text-sm">{blockchainData.network}</div>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Block Hash</div>
                  <code className="text-xs break-all">{blockchainData.blockHash}</code>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Nonce</div>
                  <div className="font-mono text-sm">{blockchainData.nonce}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="input" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Input Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-2">Function Called</div>
                <code className="rounded bg-muted px-3 py-2 text-sm block">
                  {inputData.function}()
                </code>
              </div>
              <Separator />
              <div>
                <div className="text-sm text-muted-foreground mb-2">Parameters</div>
                <div className="space-y-3">
                  <div className="bg-muted p-3 rounded">
                    <div className="text-xs text-muted-foreground">documentHash</div>
                    <code className="text-xs break-all">{inputData.documentHash}</code>
                  </div>
                  <div className="bg-muted p-3 rounded">
                    <div className="text-xs text-muted-foreground">signerAddress</div>
                    <code className="text-xs break-all">{inputData.signerAddress}</code>
                  </div>
                  <div className="bg-muted p-3 rounded">
                    <div className="text-xs text-muted-foreground">timestamp</div>
                    <code className="text-xs">{inputData.timestamp}</code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Events Emitted</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {events.map((event, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-500" />
                    <span className="font-semibold">{event.name}</span>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    {Object.entries(event.args).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{key}:</span>
                        <code className="text-xs">{value.toString()}</code>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Gas Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Gas Used</div>
                  <div className="font-mono text-lg font-semibold">
                    {blockchainData.gasUsed}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Gas Price</div>
                  <div className="font-mono text-lg font-semibold">
                    {blockchainData.gasPrice}
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <div className="text-sm text-muted-foreground mb-1">Transaction Fee</div>
                <div className="font-mono text-2xl font-bold text-primary">
                  {blockchainData.transactionFee}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  = Gas Used × Gas Price
                </p>
              </div>
              <Separator />
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="text-sm">
                  <strong>Note:</strong> The transaction fee is paid to network validators
                  for processing and securing the transaction on the blockchain.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
