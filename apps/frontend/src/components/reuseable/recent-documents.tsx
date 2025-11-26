import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface RecentDocument {
  id: string;
  title: string;
  sender: {
    name: string;
    initials: string;
  };
  timeAgo: string;  // This is required according to backend
}

interface RecentDocumentsProps {
  documents: RecentDocument[];
}

export function RecentDocuments({ documents }: RecentDocumentsProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Recent Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{doc.sender.initials}</AvatarFallback>
              </Avatar>
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">{doc.title}</p>
                <p className="text-sm text-muted-foreground">
                  from {doc.sender.name}
                </p>
              </div>
              <div className="ml-auto font-medium text-sm text-muted-foreground">{doc.timeAgo}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
