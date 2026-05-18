import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { resourcesApi, type Resource } from '../api/resources';
import {
  FileText,
  Trash2,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  Square,
  Edit2,
  Check,
  X,
  FileUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function Resources() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState('notes');
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newFilename, setNewFilename] = useState('');
  
  // Dialog States
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [stopId, setStopId] = useState<string | null>(null);

  const { data: resources, isLoading, isError } = useQuery({
    queryKey: ['resources'],
    queryFn: resourcesApi.list,
    refetchInterval: (query) => {
      return query.state.data?.some(r => r.status === 'processing') ? 3000 : false;
    }
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, type }: { file: File; type: string }) => resourcesApi.upload(file, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setFile(null);
      toast.success('File uploaded successfully!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to upload file.';
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: resourcesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setDeleteId(null);
      toast.success('Resource deleted');
    },
    onError: () => {
      toast.error('Failed to delete resource');
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, filename }: { id: string; filename: string }) => 
      resourcesApi.update(id, { filename }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setEditingId(null);
      toast.success('Resource renamed');
    },
    onError: () => {
      toast.error('Failed to rename resource');
    },
  });

  const retryMutation = useMutation({
    mutationFn: resourcesApi.retry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Processing restarted');
    },
    onError: () => {
      toast.error('Failed to restart processing');
    },
  });

  const stopMutation = useMutation({
    mutationFn: resourcesApi.stop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setStopId(null);
      toast.success('Processing stopped');
    },
    onError: () => {
      toast.error('Failed to stop processing');
    },
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync({ file, type });
    } finally {
      setIsUploading(false);
    }
  };

  const startRenaming = (id: string, currentName: string) => {
    setEditingId(id);
    setNewFilename(currentName);
  };

  const handleRename = (id: string) => {
    if (!newFilename.trim()) return;
    renameMutation.mutate({ id, filename: newFilename });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready': 
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 flex items-center gap-1">
          <CheckCircle className="size-3" /> Ready
        </Badge>;
      case 'failed': 
        return <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="size-3" /> Failed
        </Badge>;
      case 'processing': 
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border-blue-500/20 flex items-center gap-1">
          <Loader2 className="size-3 animate-spin" /> Processing
        </Badge>;
      default: 
        return <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="size-3" /> Pending
        </Badge>;
    }
  };

  return (
    <div className="container max-w-6xl py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileText className="size-8 text-primary" />
          Study Resources
        </h1>
        <p className="text-muted-foreground">
          Manage your notes, syllabi, and past papers for AI-powered solving.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Card */}
        <Card className="lg:col-span-1 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <FileUp className="size-5 text-primary" />
              Upload
            </CardTitle>
            <CardDescription>
              Add new PDF or Text materials (max 12 pages).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="file" className="text-sm font-semibold">Document File</Label>
                <div className="relative group cursor-pointer">
                  <div className={cn(
                    "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors",
                    file ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-accent/50"
                  )}>
                    <Upload className={cn("size-8 mb-3 transition-colors", file ? "text-primary" : "text-muted-foreground")} />
                    <p className="text-sm font-medium text-center">
                      {file ? file.name : "Click to select or drag and drop"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, TXT up to 20MB</p>
                  </div>
                  <input
                    id="file"
                    type="file"
                    accept=".pdf,.txt"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="text-sm font-semibold">Resource Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type" className="rounded-xl">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="notes">Lecture Notes</SelectItem>
                    <SelectItem value="syllabus">Exam Syllabus</SelectItem>
                    <SelectItem value="past_paper">Past Year Paper</SelectItem>
                    <SelectItem value="other">Other Material</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                className="w-full rounded-xl h-11 font-semibold"
                disabled={!file || isUploading}
              >
                {isUploading ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="mr-2 size-4" /> Upload Document</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* List Card */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Your Documents</CardTitle>
              <Badge variant="outline" className="font-mono">
                {resources?.length || 0} Total
              </Badge>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[45%] font-bold">Name</TableHead>
                  <TableHead className="font-bold">Type</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="text-right font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Loader2 className="size-8 animate-spin text-primary" />
                        <p>Loading your library...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                      <div className="flex flex-col items-center gap-2 text-destructive">
                        <XCircle className="size-8" />
                        <p>Failed to load resources.</p>
                        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({queryKey: ['resources']})}>
                          Try Again
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !resources || resources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-3">
                        <FileText className="size-12 opacity-10" />
                        <div className="space-y-1">
                          <p className="font-medium">No documents yet</p>
                          <p className="text-xs">Upload your first study material to get started.</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  resources.map((res) => (
                    <TableRow key={res.id} className="group transition-colors hover:bg-muted/20">
                      <TableCell>
                        {editingId === res.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={newFilename}
                              onChange={(e) => setNewFilename(e.target.value)}
                              className="h-8 text-sm focus-visible:ring-primary rounded-lg"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename(res.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                            />
                            <Button size="icon" variant="ghost" className="size-8 text-emerald-600" onClick={() => handleRename(res.id)}>
                              <Check className="size-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold truncate max-w-[200px]">{res.filename}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => startRenaming(res.id, res.filename)}
                            >
                              <Edit2 className="size-3 text-muted-foreground" />
                            </Button>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Added {new Date(res.created_at).toLocaleDateString()}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium capitalize text-muted-foreground">
                          {res.type.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2 min-w-[120px]">
                          {getStatusBadge(res.status)}
                          {res.status === 'processing' && (
                            <div className="space-y-1">
                              <Progress value={res.processing_progress} className="h-1.5 w-full bg-blue-100 dark:bg-blue-900/20" />
                              <p className="text-[10px] text-right font-mono font-medium text-blue-600 dark:text-blue-400">
                                {res.processing_progress}%
                              </p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild className="size-9 text-muted-foreground hover:text-primary">
                            <a href={res.file_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="size-4" />
                            </a>
                          </Button>
                          
                          {res.status === 'failed' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="size-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              onClick={() => retryMutation.mutate(res.id)}
                              disabled={retryMutation.isPending}
                            >
                              <RefreshCw className={cn("size-4", retryMutation.isPending && "animate-spin")} />
                            </Button>
                          )}

                          {res.status === 'processing' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="size-9 text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                              onClick={() => setStopId(res.id)}
                            >
                              <Square className="size-4 fill-current" />
                            </Button>
                          )}

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="size-9 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteId(res.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Confirmation Dialogs */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the document from your library and storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive hover:bg-destructive/90 rounded-xl"
            >
              Delete Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!stopId} onOpenChange={() => setStopId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Stop Processing?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to abort the AI extraction for this document? You can retry it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Keep Processing</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => stopId && stopMutation.mutate(stopId)}
              className="bg-orange-600 hover:bg-orange-700 rounded-xl"
            >
              Stop Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
