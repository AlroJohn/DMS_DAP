import { RecycleBinProvider } from "@/context/recycle-bin-context";
import RecycleBinPageContent from "./page-content";

export default function RecycleBinPage() {
  return (
    <RecycleBinProvider>
      <RecycleBinPageContent />
    </RecycleBinProvider>
  );
}