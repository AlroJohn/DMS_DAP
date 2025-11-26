import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, User, X } from 'lucide-react';
import { useUsers } from '@/hooks/use-users';

interface ShareDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
  onShare: (userIds: string[]) => Promise<void>;
  onShared?: () => void;
}

interface User {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export function ShareDocumentModal({
  open,
  onOpenChange,
  documentId,
  documentTitle,
  onShare,
  onShared
}: ShareDocumentModalProps) {
  const { users: allUsers, isLoading, error } = useUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  // Filter users based on search term
  useEffect(() => {
    if (allUsers) {
      const term = searchTerm.toLowerCase();
      const filtered = allUsers.filter((user: any) => 
        user.email.toLowerCase().includes(term) ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(term)
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, allUsers]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const removeSelectedUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(id => id !== userId));
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0) return;
    
    try {
      await onShare(selectedUsers);
      onOpenChange(false);
      if (onShared) onShared();
      // Reset selections
      setSelectedUsers([]);
    } catch (err) {
      console.error('Error sharing document:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Share Document: {documentTitle}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
              Error: {error}
            </div>
          )}
          
          <div className="flex-1">
            <h3 className="font-medium mb-2">Available Users</h3>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No users found</p>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {filteredUsers.map((user: any) => (
                    <div 
                      key={user.user_id} 
                      className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer"
                      onClick={() => toggleUserSelection(user.user_id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedUsers.includes(user.user_id)}
                          onCheckedChange={() => toggleUserSelection(user.user_id)}
                        />
                        <div className="flex items-center gap-2">
                          <User className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{user.first_name} {user.last_name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Selected Users</h3>
            {selectedUsers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No users selected</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {filteredUsers
                  .filter((user: any) => selectedUsers.includes(user.user_id))
                  .map((user: any) => (
                    <Badge key={user.user_id} variant="secondary" className="flex items-center gap-1">
                      {user.first_name} {user.last_name}
                      <button 
                        type="button" 
                        className="ml-1 rounded-full hover:bg-destructive hover:text-destructive-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSelectedUser(user.user_id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleShare} 
            disabled={selectedUsers.length === 0}
          >
            Share Document ({selectedUsers.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}