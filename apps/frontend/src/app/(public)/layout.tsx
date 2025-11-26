export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">DMS</span>
              </div>
              <span className="font-semibold text-gray-900">Document Management System</span>
            </div>
            <div className="text-sm text-gray-600">
              Public Verification Portal
            </div>
          </div>
        </div>
      </header>
      
      <main>{children}</main>
      
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>&copy; 2024 Document Management System. All rights reserved.</p>
            <p className="mt-1">Powered by blockchain technology for secure document verification.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}