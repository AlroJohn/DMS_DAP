import { Metadata } from "next";
import ComplianceReportsContent from "./compliance-content";

export const metadata: Metadata = {
  title: "Compliance Reports | DMS",
  description: "Digital signature compliance and audit reports",
};

export default function ComplianceReportsPage() {
  return <ComplianceReportsContent />;
}